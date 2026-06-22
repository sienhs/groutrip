package com.enjoytrip.backend.domain.mypage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveRequest;
import com.enjoytrip.backend.domain.mypage.dto.RetrospectiveResponse;
import com.enjoytrip.backend.domain.mypage.entity.Retrospective;
import com.enjoytrip.backend.domain.mypage.repository.RetrospectiveRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class RetrospectiveServiceTest {

    private RetrospectiveRepository retrospectiveRepository;
    private TravelGroupRepository travelGroupRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private RetrospectiveService retrospectiveService;

    @BeforeEach
    void setUp() {
        retrospectiveRepository = mock(RetrospectiveRepository.class);
        travelGroupRepository = mock(TravelGroupRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        retrospectiveService = new RetrospectiveService(
                retrospectiveRepository, travelGroupRepository, currentUserResolver, groupAccessValidator);
    }

    @Test
    void createsRetrospectiveOnCompletedGroup() {
        User user = user();
        LocalDate today = LocalDate.now();
        TravelGroup completed = group(today.minusDays(10), today.minusDays(5)); // 종료됨
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(completed));
        when(retrospectiveRepository.findByTravelGroupIdAndUserId(1L, 1L)).thenReturn(Optional.empty());
        when(retrospectiveRepository.save(any(Retrospective.class))).thenAnswer(inv -> {
            Retrospective r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 7L);
            return r;
        });

        RetrospectiveResponse response = retrospectiveService.upsert(1L,
                new RetrospectiveRequest("좋은 여행이었어요", 5));

        assertThat(response.id()).isEqualTo(7L);
        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.content()).isEqualTo("좋은 여행이었어요");
    }

    @Test
    void rejectsRetrospectiveOnNonCompletedGroup() {
        User user = user();
        LocalDate today = LocalDate.now();
        TravelGroup upcoming = group(today.plusDays(5), today.plusDays(7)); // 아직 시작 전
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(travelGroupRepository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(upcoming));

        assertThatThrownBy(() -> retrospectiveService.upsert(1L, new RetrospectiveRequest("후기", 4)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void getMineThrowsWhenAbsent() {
        User user = user();
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(retrospectiveRepository.findByTravelGroupIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> retrospectiveService.getMine(1L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    // --- helpers ---

    private User user() {
        User user = User.builder().email("u@test.com").password("enc").name("user").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private TravelGroup group(LocalDate start, LocalDate end) {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("서울특별시")
                .startDate(start).endDate(end)
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }
}
