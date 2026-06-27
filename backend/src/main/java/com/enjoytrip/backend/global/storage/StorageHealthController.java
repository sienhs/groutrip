package com.enjoytrip.backend.global.storage;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

/**
 * S3 연결 상태 진단 엔드포인트.
 * 인증이 필요한 내부 API — 로그인한 사용자라면 누구나 조회 가능(민감 정보 미노출).
 * GET /api/admin/storage/health
 */
@RestController
@RequestMapping("/api/admin/storage")
@RequiredArgsConstructor
public class StorageHealthController {

    private final ObjectStorageService storageService;

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        Map<String, String> result = storageService.diagnose();
        boolean ok = "OK".equals(result.get("status"));
        return ResponseEntity.status(ok ? 200 : 503)
                .body(ApiResponse.success(ok ? "S3 정상" : "S3 오류", result));
    }
}
