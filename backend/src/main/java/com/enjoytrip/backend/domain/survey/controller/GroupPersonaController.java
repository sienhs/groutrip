package com.enjoytrip.backend.domain.survey.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse;
import com.enjoytrip.backend.domain.survey.service.GroupPersonaService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * FR-SURVEY-03: 그룹 성향 매칭 조회. 그룹 멤버만 접근할 수 있다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/persona")
@RequiredArgsConstructor
@Tag(name = "Group Persona", description = "그룹 성향 매칭 API")
public class GroupPersonaController {

    private final GroupPersonaService groupPersonaService;

    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "그룹 성향 매칭 조회",
            description = """
                    FR-SURVEY-03: 그룹 멤버들의 평균 성향 벡터, 코사인 유사도 기반 일치율(%),
                    가장 충돌하는 차원을 반환한다. 성향 설문을 완료한 멤버만 계산에 포함된다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupPersonaResponse>> getGroupPersona(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        GroupPersonaResponse response = groupPersonaService.getGroupPersona(groupId);
        return ResponseEntity.ok(ApiResponse.success("그룹 성향 매칭 조회 성공", response));
    }
}
