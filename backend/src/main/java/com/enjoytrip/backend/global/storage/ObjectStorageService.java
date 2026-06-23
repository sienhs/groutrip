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
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

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

	@PostConstruct
	void init() {
		try {
			s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
			log.info("[storage] S3 버킷 확인 완료: {}", bucket);
		} catch (RuntimeException e) {
			// 버킷 미존재/권한 부족이어도 부팅은 계속한다(업로드 시점에 실제 오류가 드러난다).
			log.warn("[storage] S3 버킷 확인 실패(부팅은 계속): bucket={} {}", bucket, e.getMessage());
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
