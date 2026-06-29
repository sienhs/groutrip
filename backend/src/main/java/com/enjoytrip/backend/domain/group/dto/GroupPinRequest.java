package com.enjoytrip.backend.domain.group.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 상단 고정 공지 설정 요청. type은 게시판 공지글(POST) 또는 진행중 투표(VOTE). */
public record GroupPinRequest(
        @NotNull
        @Pattern(regexp = "POST|VOTE", message = "type은 POST 또는 VOTE 여야 합니다.")
        String type,

        @NotNull
        Long refId,

        @Size(max = 200)
        String title
) {
}
