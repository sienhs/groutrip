package com.enjoytrip.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class BackendApplication {

    // JPA Auditing과 Scheduler를 함께 활성화해 생성/수정 시각과 그룹 상태 배치를 사용한다.
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
