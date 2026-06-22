package com.enjoytrip.backend.domain.auth.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class LoginAttemptServiceTest {

    @Test
    void blocksClientAfterFiveConsecutiveFailures() {
        LoginAttemptService service = new LoginAttemptService();
        for (int attempt = 0; attempt < 5; attempt++) {
            service.recordFailure("127.0.0.1");
        }

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.checkAllowed("127.0.0.1")
        );

        assertEquals(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS, exception.getErrorCode());
    }

    @Test
    void successfulLoginResetsFailureCount() {
        LoginAttemptService service = new LoginAttemptService();
        for (int attempt = 0; attempt < 4; attempt++) {
            service.recordFailure("127.0.0.1");
        }
        service.recordSuccess("127.0.0.1");

        assertDoesNotThrow(() -> service.checkAllowed("127.0.0.1"));
    }
}
