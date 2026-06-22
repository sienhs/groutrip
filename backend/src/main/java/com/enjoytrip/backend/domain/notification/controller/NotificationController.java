package com.enjoytrip.backend.domain.notification.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.notification.dto.NotificationResponse;
import com.enjoytrip.backend.domain.notification.service.NotificationService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "내 알림 조회 및 읽음 처리 API")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "내 알림 목록 조회")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> findMine() {
        return ResponseEntity.ok(ApiResponse.success("Notifications found.", notificationService.findMine()));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "읽지 않은 알림 수 조회")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countUnread() {
        return ResponseEntity.ok(ApiResponse.success(
                "Unread notification count found.",
                Map.of("count", notificationService.countUnread())
        ));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "알림 읽음 처리")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(@PathVariable Long notificationId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Notification marked as read.",
                notificationService.markRead(notificationId)
        ));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "모든 알림 읽음 처리")
    public ResponseEntity<ApiResponse<Void>> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read."));
    }
}
