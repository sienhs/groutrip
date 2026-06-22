package com.enjoytrip.backend.domain.survey.dto;

/**
 * FR-SURVEY-03: 그룹 성향 매칭 결과.
 * 멤버들의 평균 성향 벡터, 코사인 유사도 기반 일치율(%), 가장 충돌하는 차원을 제공한다.
 * 응답한 멤버가 0명이면 vector/일치율/충돌 차원은 모두 null, 1명이면 평균만 제공한다.
 */
public record GroupPersonaResponse(
        int memberCount,                 // 활성 멤버 수
        int respondedCount,              // 성향 설문을 완료한 멤버 수
        PersonaVector average,           // 평균 성향 벡터(응답자 없으면 null)
        Integer matchRate,               // 성향 일치율 %(0~100), 응답자 2명 미만이면 null
        String mostConflictingDimension, // 가장 갈리는 차원의 enum 이름(예: PACE), 2명 미만이면 null
        String conflictMessage           // 충돌 차원 한 줄 설명, 2명 미만이면 null
) {

    public record PersonaVector(
            double activity,
            double food,
            double pace,
            double urbanNature,
            double timePref
    ) {
    }
}
