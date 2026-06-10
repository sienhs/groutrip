package com.enjoytrip.backend.domain.group.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupStatusBatchService {

    private final TravelGroupRepository travelGroupRepository;

    // 8.1 그룹 상태 전이: 매일 자정에 가까운 시각에 저장된 그룹 상태를 날짜 기준으로 갱신한다.
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void updateGroupStatusesDaily() {
        updateGroupStatuses(LocalDate.now());
    }

    // 테스트와 수동 실행을 쉽게 하기 위해 기준 날짜를 파라미터로 받는 실제 배치 로직이다.
    @Transactional
    public void updateGroupStatuses(LocalDate today) {
        List<TravelGroup> groups = travelGroupRepository.findByDeletedAtIsNull();
        for (TravelGroup group : groups) {
            group.updateStatus(today);
        }
        log.info("Group status batch completed. targetDate={}, count={}", today, groups.size());
    }
}
