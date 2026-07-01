package com.enjoytrip.backend.domain.expense.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * 부팅 시 1회 자가 치유: 이미 강퇴됐지만 예전 데이터라 지출 분담에 남아 있는 멤버를 정리한다.
 * 강퇴 로직(GroupService.kickMember)이 도입되기 전 강퇴된 멤버는 아직 정산에 포함돼 있고,
 * 그 지출을 수정할 때 활성 멤버 검증에서 크래시가 나므로 여기서 한 번 정리한다.
 * 정리 대상이 없으면 아무 것도 하지 않으므로(쿼리 1회) 이후 부팅에서는 사실상 무비용이다.
 */
@Component
@RequiredArgsConstructor
public class ExpenseDataHealer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ExpenseDataHealer.class);

    private final ExpenseService expenseService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            int healed = expenseService.healLeftMemberSplits();
            if (healed > 0) {
                log.info("[settlement-heal] 강퇴됐지만 정산에 남아 있던 멤버 {}건을 분담에서 정리했습니다.", healed);
            }
        } catch (Exception e) {
            // 자가 치유 실패가 앱 기동을 막지 않도록 로그만 남기고 계속 진행한다.
            log.warn("[settlement-heal] 강퇴 멤버 분담 정리 중 오류(무시하고 계속): {}", e.getMessage());
        }
    }
}
