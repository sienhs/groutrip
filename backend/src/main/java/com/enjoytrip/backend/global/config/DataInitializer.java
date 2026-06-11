package com.enjoytrip.backend.global.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        seedTestUser();
    }

    private void seedTestUser() {
        if (userRepository.existsByEmail("test@test.com")) {
            log.info("Test user already exists. Skip seed.");
            return;
        }

        User testUser = User.builder()
                .email("test@test.com")
                .password(passwordEncoder.encode("test1234"))
                .name("Test User")
                .build();

        userRepository.save(testUser);
        log.info("Test user created: test@test.com / test1234");
    }
}
