package com.enjoytrip.backend.global.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void malformedPathParameterReturnsBadRequest() {
        MethodArgumentTypeMismatchException exception = new MethodArgumentTypeMismatchException(
                "abc",
                Long.class,
                "groupId",
                mock(MethodParameter.class),
                new NumberFormatException()
        );

        assertEquals(HttpStatus.BAD_REQUEST, handler.handleMalformedRequest(exception).getStatusCode());
    }

    @Test
    void malformedJsonReturnsBadRequest() {
        HttpMessageNotReadableException exception = new HttpMessageNotReadableException(
                "Malformed JSON",
                mock(HttpInputMessage.class)
        );

        assertEquals(HttpStatus.BAD_REQUEST, handler.handleMalformedRequest(exception).getStatusCode());
    }

    @Test
    void unknownApiPathReturnsNotFound() {
        NoResourceFoundException exception = new NoResourceFoundException(
                HttpMethod.GET,
                "/api/missing",
                "No static resource"
        );

        assertEquals(HttpStatus.NOT_FOUND, handler.handleNoResourceFound(exception).getStatusCode());
    }
}
