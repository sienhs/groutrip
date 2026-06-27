package com.enjoytrip.backend.global.storage;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyExistsException;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.BucketLocationConstraint;
import software.amazon.awssdk.services.s3.model.CreateBucketConfiguration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * 이미지/파일 객체 스토리지(AWS S3) 게이트웨이.
 *
 * 엔티티에는 바이트가 아니라 이 서비스가 돌려준 object key(varchar)만 저장하고,
 * 조회 시 key로 다시 바이트를 읽어 컨트롤러가 스트리밍한다.
 * 버킷은 AWS 콘솔/IaC로 사전 생성돼 있다고 가정한다(부팅 시 존재 여부만 best-effort 확인).
 */
@Component
@RequiredArgsConstructor
public class ObjectStorageService {

	private static final Logger log = LoggerFactory.getLogger(ObjectStorageService.class);
	private static final String DEFAULT_CONTENT_TYPE = "application/octet-stream";

	private final S3Client s3Client;

	@Value("${storage.s3.bucket}")
	private String bucket;

	@Value("${storage.s3.region}")
	private String region;

	private volatile boolean bucketReady = false;

	@Value("${storage.s3.endpoint:}")
	private String endpoint;

	@Value("${storage.s3.access-key:}")
	private String accessKeyHint; // 로그용: 앞 4자리만 노출

	@PostConstruct
	void init() {
		log.info("[storage] S3 설정 — bucket={} region={} endpoint={} credentials={}",
				bucket, region,
				(endpoint == null || endpoint.isBlank()) ? "AWS S3 (기본)" : endpoint,
				(accessKeyHint == null || accessKeyHint.isBlank()) ? "DefaultCredentialsProvider" : accessKeyHint.substring(0, Math.min(4, accessKeyHint.length())) + "****");
		ensureBucket();
	}

	/**
	 * 버킷이 없으면 생성한다(best-effort). 로컬/신규 환경에서 업로드 500("bucket does not exist")을 막는다.
	 * 권한 부족이나 글로벌 이름 충돌로 생성 실패 시엔 경고만 남기고, 실제 오류는 업로드 시점에 드러난다.
	 */
	private void ensureBucket() {
		if (bucketReady) {
			return;
		}
		try {
			s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
			bucketReady = true;
			return;
		} catch (NoSuchBucketException e) {
			// 없음 → 아래에서 생성 시도
		} catch (S3Exception e) {
			if (e.statusCode() != 404) {
				// 권한 등 다른 문제: 생성 시도하지 않고 종료(업로드 시 실제 오류 노출)
				log.warn("[storage] S3 버킷 확인 실패(부팅 계속): bucket={} {}", bucket, e.getMessage());
				return;
			}
		}
		try {
			CreateBucketRequest.Builder request = CreateBucketRequest.builder().bucket(bucket);
			// us-east-1 외 리전은 LocationConstraint가 필요하다.
			if (region != null && !region.isBlank() && !"us-east-1".equals(region)) {
				request.createBucketConfiguration(CreateBucketConfiguration.builder()
						.locationConstraint(BucketLocationConstraint.fromValue(region))
						.build());
			}
			s3Client.createBucket(request.build());
			bucketReady = true;
			log.info("[storage] S3 버킷 생성 완료: {}", bucket);
		} catch (BucketAlreadyOwnedByYouException | BucketAlreadyExistsException e) {
			bucketReady = true; // 이미 존재(내 소유) → 사용 가능
		} catch (RuntimeException e) {
			log.warn("[storage] S3 버킷 생성 실패(업로드 시 재시도): bucket={} {}", bucket, e.getMessage());
		}
	}

	/**
	 * 바이트를 업로드하고 저장 key를 반환한다. key 형식: {prefix}/{uuid}.
	 *
	 * @param prefix      논리 폴더(예: "avatars", "group-covers")
	 * @param data        파일 바이트
	 * @param contentType MIME 타입(null이면 octet-stream)
	 */
	public String upload(String prefix, byte[] data, String contentType) {
		ensureBucket(); // 버킷이 아직 없으면 생성 시도(부팅 시 실패했을 수 있음)
		String key = prefix + "/" + UUID.randomUUID().toString().replace("-", "");
		try {
			s3Client.putObject(PutObjectRequest.builder()
							.bucket(bucket)
							.key(key)
							.contentType(contentType == null ? DEFAULT_CONTENT_TYPE : contentType)
							.build(),
					RequestBody.fromBytes(data));
			return key;
		} catch (Exception e) {
			log.error("[storage] 업로드 실패 key={}: {}", key, e.getMessage());
			throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
		}
	}

	/** key로 객체 바이트를 읽는다. 없으면 NOT_FOUND. */
	public byte[] download(String key) {
		try {
			return s3Client.getObjectAsBytes(GetObjectRequest.builder()
					.bucket(bucket)
					.key(key)
					.build()).asByteArray();
		} catch (NoSuchKeyException e) {
			throw new BusinessException(ErrorCode.NOT_FOUND);
		} catch (Exception e) {
			log.error("[storage] 다운로드 실패 key={}: {}", key, e.getMessage());
			throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
		}
	}

	/**
	 * S3 연결 상태를 진단한다. 테스트 파일을 업로드 → 다운로드 → 삭제해 전체 I/O를 검증.
	 * @return 상태 정보 맵 (status, bucket, endpoint, detail)
	 */
	public java.util.Map<String, String> diagnose() {
		java.util.Map<String, String> result = new java.util.LinkedHashMap<>();
		result.put("bucket", bucket);
		result.put("region", region);
		result.put("endpoint", (endpoint == null || endpoint.isBlank()) ? "AWS S3 (기본)" : endpoint);
		result.put("credentials", (accessKeyHint == null || accessKeyHint.isBlank())
				? "DefaultCredentialsProvider" : accessKeyHint.substring(0, Math.min(4, accessKeyHint.length())) + "****");
		result.put("bucketReady", String.valueOf(bucketReady));
		String testKey = "health-check/" + java.util.UUID.randomUUID().toString().replace("-", "");
		try {
			byte[] payload = "groutrip-s3-health-ok".getBytes(java.nio.charset.StandardCharsets.UTF_8);
			String uploadedKey = upload("health-check", payload, "text/plain");
			String downloaded = new String(download(uploadedKey), java.nio.charset.StandardCharsets.UTF_8);
			delete(uploadedKey);
			result.put("status", "OK");
			result.put("detail", "업로드→다운로드→삭제 성공: " + downloaded);
		} catch (Exception e) {
			result.put("status", "ERROR");
			result.put("detail", e.getMessage());
		}
		return result;
	}

	/** 객체 삭제(best-effort). 실패해도 호출자 흐름은 막지 않는다. */
	public void delete(String key) {
		if (key == null || key.isBlank()) {
			return;
		}
		try {
			s3Client.deleteObject(DeleteObjectRequest.builder()
					.bucket(bucket)
					.key(key)
					.build());
		} catch (Exception e) {
			log.warn("[storage] 객체 삭제 실패 key={}: {}", key, e.getMessage());
		}
	}
}
