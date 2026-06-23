package com.enjoytrip.backend.domain.mypage.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.expense.repository.ExpenseRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.mypage.dto.MyStatsResponse;
import com.enjoytrip.backend.domain.place.repository.BookmarkRepository;

import lombok.RequiredArgsConstructor;

/**
 * FR-MYPAGE: 내 여행 통계 집계. 홈 대시보드와 동일하게 "내가 활성 멤버인, 삭제되지 않은 그룹"을 기준으로 한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyStatsService {

    private final CurrentUserResolver currentUserResolver;
    private final GroupMemberRepository groupMemberRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ExpenseRepository expenseRepository;

    public MyStatsResponse getMyStats() {
        User user = currentUserResolver.getCurrentUser();
        LocalDate today = LocalDate.now();

        List<TravelGroup> groups = groupMemberRepository.findByUserIdAndLeftAtIsNull(user.getId()).stream()
                .map(GroupMember::getTravelGroup)
                .filter(group -> group.getDeletedAt() == null)
                .toList();

        int inProgress = 0;
        int upcoming = 0;
        int completed = 0;
        long totalTripDays = 0;
        Set<String> destinations = new HashSet<>();

        for (TravelGroup group : groups) {
            switch (GroupStatus.fromDates(group.getStartDate(), group.getEndDate(), today)) {
                case IN_PROGRESS -> inProgress++;
                case PLANNING -> upcoming++;
                case COMPLETED -> {
                    completed++;
                    totalTripDays += ChronoUnit.DAYS.between(group.getStartDate(), group.getEndDate()) + 1;
                }
            }
            if (group.getDestination() != null && !group.getDestination().isBlank()) {
                destinations.add(group.getDestination().trim());
            }
        }

        return new MyStatsResponse(
                inProgress,
                upcoming,
                completed,
                groups.size(),
                totalTripDays,
                destinations.size(),
                bookmarkRepository.countByCreatedById(user.getId()),
                expenseRepository.sumAmountByPayerId(user.getId()));
    }
}
