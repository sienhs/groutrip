package com.enjoytrip.backend.global.exception;

import com.enjoytrip.backend.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
	/**
	 *  
	 * 애플리케이션 전역에서 발생하는 예외 처리 클래스
	 * RestController에서 던진걸 여기서 받은 다음 json으로 직렬화 함
	 * 	계속 위로 던지고 RestControllerAdvice가 낚아챔
	 */
	
	// BusinessException처리
	// 클라 문제는 warn 레벨
	// 에러 응답에는 data가 없어서 void 
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn("BusinessException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getStatus()) // 상태코드 넣고
                .body(ApiResponse.fail(e.getMessage())); // Errorcode에서 메세지 꺼냄
    }

    // 경로/쿼리 파라미터 변환, 필수 헤더, JSON 파싱 실패는 모두 클라이언트 입력 오류로 처리한다.
    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class,
            ServletRequestBindingException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleMalformedRequest(Exception e) {
        log.warn("Malformed request: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.fail(ErrorCode.INVALID_INPUT.getMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException e) {
        log.warn("Resource not found: {}", e.getResourcePath());
        return ResponseEntity.status(ErrorCode.NOT_FOUND.getStatus())
                .body(ApiResponse.fail(ErrorCode.NOT_FOUND.getMessage()));
    }
    
    // @Valid 검증 실패
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
    	String message = e.getBindingResult()
    			.getFieldErrors()
    			.stream()
    			.map(error -> error.getField() + ": " + error.getDefaultMessage())
    			.findFirst()
    			.orElse(ErrorCode.INVALID_INPUT.getMessage());
    	
    	log.warn("ValidationException: {}", message);
    	return ResponseEntity.badRequest().body(ApiResponse.fail(message));    	
    }
    
    // 예상 못한 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e){
    	log.error("Unexcepted Exception: ", e);
    	return ResponseEntity.internalServerError().body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
    }
    
    
}
