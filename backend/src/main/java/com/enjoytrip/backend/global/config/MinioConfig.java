package com.enjoytrip.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

/**
 * MinIO(S3 호환) 클라이언트 빈. 자격증명/엔드포인트는 minio.* 프로퍼티(.env)에서 주입한다.
 * 실제 버킷 생성·업로드·다운로드는 {@code ObjectStorageService}가 담당한다.
 */
@Configuration
public class MinioConfig {

	@Bean
	public MinioClient minioClient(
			@Value("${minio.endpoint}") String endpoint,
			@Value("${minio.access-key}") String accessKey,
			@Value("${minio.secret-key}") String secretKey) {
		return MinioClient.builder()
				.endpoint(endpoint)
				.credentials(accessKey, secretKey)
				.build();
	}
}
