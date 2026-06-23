package com.enjoytrip.backend.global.storage;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.errors.ErrorResponseException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

/**
 * 이미지/파일 객체 스토리지(MinIO) 게이트웨이.
 *
 * 엔티티에는 바이트가 아니라 이 서비스가 돌려준 object key(varchar)만 저장하고,
 * 조회 시 key로 다시 바이트를 읽어 컨트롤러가 스트리밍한다.
 * 버킷은 부팅 시(실패해도 부팅은 계속) 또는 첫 업로드 시 멱등 생성한다.
 */
@Component
@RequiredArgsConstructor
public class ObjectStorageService {

	private static final Logger log = LoggerFactory.getLogger(ObjectStorageService.class);
	private static final String DEFAULT_CONTENT_TYPE = "application/octet-stream";

	private final MinioClient minioClient;

	@Value("${minio.bucket-name}")
	private String bucket;

	private volatile boolean bucketReady = false;

	@PostConstruct
	void init() {
		try {
			ensureBucket();
			log.info("[storage] MinIO 버킷 준비 완료: {}", bucket);
		} catch (RuntimeException e) {
			// MinIO 미가동 상태로 부팅할 수 있게 하되, 업로드 시점에 다시 시도한다.
			log.warn("[storage] MinIO 버킷 초기화 실패(부팅은 계속, 업로드 시 재시도): {}", e.getMessage());
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
		ensureBucket();
		String key = prefix + "/" + UUID.randomUUID().toString().replace("-", "");
		try (InputStream stream = new ByteArrayInputStream(data)) {
			minioClient.putObject(PutObjectArgs.builder()
					.bucket(bucket)
					.object(key)
					.stream(stream, data.length, -1)
					.contentType(contentType == null ? DEFAULT_CONTENT_TYPE : contentType)
					.build());
			return key;
		} catch (Exception e) {
			log.error("[storage] 업로드 실패 key={}: {}", key, e.getMessage());
			throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
		}
	}

	/** key로 객체 바이트를 읽는다. 없으면 NOT_FOUND. */
	public byte[] download(String key) {
		try (InputStream stream = minioClient.getObject(GetObjectArgs.builder()
				.bucket(bucket)
				.object(key)
				.build())) {
			return stream.readAllBytes();
		} catch (ErrorResponseException e) {
			// NoSuchKey 등 — 객체 없음
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
			minioClient.removeObject(RemoveObjectArgs.builder()
					.bucket(bucket)
					.object(key)
					.build());
		} catch (Exception e) {
			log.warn("[storage] 객체 삭제 실패 key={}: {}", key, e.getMessage());
		}
	}

	private synchronized void ensureBucket() {
		if (bucketReady) {
			return;
		}
		try {
			boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
			if (!exists) {
				minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
			}
			bucketReady = true;
		} catch (Exception e) {
			throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
		}
	}
}
