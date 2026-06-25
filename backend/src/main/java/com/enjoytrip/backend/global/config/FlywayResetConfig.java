package com.enjoytrip.backend.global.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 개발/시연 편의: 부팅할 때마다 DB를 초기화한다(Flyway clean → migrate).
 * migrate 직후 {@link DataInitializer}가 테스트 계정·설문 시드를 다시 채운다.
 *
 * <p>안전장치(운영 데이터 보호):
 * <ul>
 *   <li>{@code app.db-reset-on-start}가 false면 일반 migrate만 수행(기본 운영값 false).</li>
 *   <li>{@code prod} 프로필이 활성화되면 플래그와 무관하게 clean을 강제로 막는다(이중 차단).</li>
 * </ul>
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class FlywayResetConfig {

	@Value("${app.db-reset-on-start:false}")
	private boolean resetOnStart;

	private final Environment environment;

	@Bean
	public FlywayMigrationStrategy flywayMigrationStrategy() {
		return flyway -> {
			boolean prodActive = Arrays.asList(environment.getActiveProfiles()).contains("prod");
			if (resetOnStart && !prodActive) {
				log.warn("[DB RESET] 부팅 시 DB 초기화 수행 — Flyway clean 후 재마이그레이션 (개발/시연 전용)");
				flyway.clean();
				flyway.migrate();
			} else {
				if (resetOnStart) {
					log.warn("[DB RESET] prod 프로필이 활성화되어 DB 초기화를 건너뜁니다(운영 데이터 보호).");
				}
				flyway.migrate();
			}
		};
	}
}
