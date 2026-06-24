package com.enjoytrip.backend.global.config;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

/**
 * AWS S3 클라이언트 빈. 자격증명/리전은 storage.s3.* 프로퍼티(.env의 AWS_* 키)에서 주입한다.
 * access/secret 키가 비어 있으면 기본 자격증명 체인(IAM 역할, 환경변수 등)으로 폴백한다.
 * storage.s3.endpoint(AWS_S3_ENDPOINT)가 지정되면 S3 호환 스토리지(MinIO 등)로 연결한다(로컬 개발용).
 * 실제 업로드·다운로드·삭제는 {@code ObjectStorageService}가 담당한다.
 */
@Configuration
public class S3Config {

	@Bean
	public S3Client s3Client(
			@Value("${storage.s3.region}") String region,
			@Value("${storage.s3.access-key:}") String accessKey,
			@Value("${storage.s3.secret-key:}") String secretKey,
			@Value("${storage.s3.endpoint:}") String endpoint) {
		AwsCredentialsProvider credentials = (accessKey != null && !accessKey.isBlank()
				&& secretKey != null && !secretKey.isBlank())
				? StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))
				: DefaultCredentialsProvider.create();
		S3ClientBuilder builder = S3Client.builder()
				.region(Region.of(region))
				.credentialsProvider(credentials);
		// 로컬 MinIO 등 S3 호환 엔드포인트: path-style 접근 필요.
		if (endpoint != null && !endpoint.isBlank()) {
			builder.endpointOverride(URI.create(endpoint)).forcePathStyle(true);
		}
		return builder.build();
	}
}
