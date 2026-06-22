package com.enjoytrip.backend.domain.sse.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.sse.service.SseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/stream")
@RequiredArgsConstructor
@Tag(name = "SSE", description = "그룹 실시간 동기화 연결 API")
public class SseController {

    private final SseService sseService;

    @RequiredGroupMember
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "그룹 SSE 연결")
    public SseEmitter subscribe(@PathVariable Long groupId) {
        return sseService.subscribe(groupId);
    }
}
