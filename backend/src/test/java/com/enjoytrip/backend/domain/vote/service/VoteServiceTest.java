package com.enjoytrip.backend.domain.vote.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.GroupRole;
import com.enjoytrip.backend.domain.group.entity.GroupStatus;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.repository.PlaceRepository;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.entity.ScheduleStatus;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.domain.vote.dto.CandidateRegisterRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteCastRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteCloseRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteSessionResponse;
import com.enjoytrip.backend.domain.vote.entity.Vote;
import com.enjoytrip.backend.domain.vote.entity.VoteCandidate;
import com.enjoytrip.backend.domain.vote.entity.VoteSession;
import com.enjoytrip.backend.domain.vote.repository.VoteCandidateRepository;
import com.enjoytrip.backend.domain.vote.repository.VoteRepository;
import com.enjoytrip.backend.domain.vote.repository.VoteSessionRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class VoteServiceTest {

    private VoteSessionRepository voteSessionRepository;
    private VoteCandidateRepository voteCandidateRepository;
    private VoteRepository voteRepository;
    private ScheduleRepository scheduleRepository;
    private PlaceRepository placeRepository;
    private CurrentUserResolver currentUserResolver;
    private GroupAccessValidator groupAccessValidator;
    private ApplicationEventPublisher eventPublisher;
    private VoteService voteService;

    @BeforeEach
    void setUp() {
        voteSessionRepository = mock(VoteSessionRepository.class);
        voteCandidateRepository = mock(VoteCandidateRepository.class);
        voteRepository = mock(VoteRepository.class);
        scheduleRepository = mock(ScheduleRepository.class);
        placeRepository = mock(PlaceRepository.class);
        currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        voteService = new VoteService(
                voteSessionRepository, voteCandidateRepository, voteRepository,
                scheduleRepository, placeRepository, currentUserResolver, groupAccessValidator, eventPublisher);
    }

    @Test
    void createSessionOpensVotingOnSchedule() {
        User user = user(1L);
        Schedule schedule = schedule(place(5L), 10L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(scheduleRepository.findByIdAndTravelGroupId(10L, 1L)).thenReturn(Optional.of(schedule));
        when(voteSessionRepository.existsByScheduleIdAndStatus(any(), any())).thenReturn(false);
        when(voteSessionRepository.save(any(VoteSession.class))).thenAnswer(inv -> {
            VoteSession s = inv.getArgument(0);
            ReflectionTestUtils.setField(s, "id", 5L);
            return s;
        });

        VoteSessionResponse response = voteService.createSession(1L, 10L,
                new com.enjoytrip.backend.domain.vote.dto.VoteSessionCreateRequest("점심 장소", null));

        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.scheduleId()).isEqualTo(10L);
        assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.VOTING);
    }

    @Test
    void registerCandidateRejectsWhenUserHasFiveAlready() {
        User user = user(1L);
        VoteSession session = openSession(user);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(voteSessionRepository.findByIdAndTravelGroupId(5L, 1L)).thenReturn(Optional.of(session));
        when(voteCandidateRepository.countByVoteSessionIdAndRegisteredById(5L, 1L)).thenReturn(5L);

        assertThatThrownBy(() -> voteService.registerCandidate(1L, 5L,
                new CandidateRegisterRequest(7L, "맛집")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void castVoteSavesNewScoreAndPublishesEvent() {
        User user = user(1L);
        VoteSession session = openSession(user);
        VoteCandidate candidate = candidate(session, place(7L), user, 101L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(voteSessionRepository.findByIdAndTravelGroupId(5L, 1L)).thenReturn(Optional.of(session));
        when(voteCandidateRepository.findByIdAndVoteSessionId(101L, 5L)).thenReturn(Optional.of(candidate));
        when(voteRepository.findByCandidateIdAndVoterId(101L, 1L)).thenReturn(Optional.empty());
        when(voteCandidateRepository.findByVoteSessionIdOrderByIdAsc(5L)).thenReturn(List.of(candidate));

        voteService.castVote(1L, 5L, new VoteCastRequest(101L, 4));

        verify(voteRepository).save(any(Vote.class));
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void castVoteRejectedWhenSessionClosed() {
        User user = user(1L);
        VoteSession session = openSession(user);
        session.close(null); // CLOSED
        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(voteSessionRepository.findByIdAndTravelGroupId(5L, 1L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> voteService.castVote(1L, 5L, new VoteCastRequest(101L, 4)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VOTE_ALREADY_CLOSED);
    }

    @Test
    void closeAutoSelectsHighestScoringCandidateAndPromotesPlace() {
        User user = user(1L);
        Schedule schedule = schedule(place(5L), 10L);
        VoteSession session = sessionFor(schedule, user);
        Place winnerPlace = place(20L);
        VoteCandidate c1 = candidate(session, winnerPlace, user, 101L);
        VoteCandidate c2 = candidate(session, place(21L), user, 102L);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(user, GroupRole.MEMBER));
        when(voteSessionRepository.findByIdAndTravelGroupId(5L, 1L)).thenReturn(Optional.of(session));
        when(voteCandidateRepository.findByVoteSessionIdOrderByIdAsc(5L)).thenReturn(List.of(c1, c2));
        // c1=5점, c2=3점 → c1 당선
        when(voteRepository.findByCandidateIdIn(anyList())).thenReturn(List.of(
                vote(c1, user, 5), vote(c2, user, 3)));

        VoteSessionResponse response = voteService.close(1L, 5L, new VoteCloseRequest(null));

        assertThat(response.winnerCandidateId()).isEqualTo(101L);
        assertThat(schedule.getStatus()).isEqualTo(ScheduleStatus.PLANNED);
        assertThat(schedule.getPlace()).isEqualTo(winnerPlace); // 당선 장소로 승격
        verify(eventPublisher).publishEvent(any(DomainEvent.class));
    }

    @Test
    void closeWithTieRequiresManualSelection() {
        User user = user(1L);
        Schedule schedule = schedule(place(5L), 10L);
        VoteSession session = sessionFor(schedule, user);
        VoteCandidate c1 = candidate(session, place(20L), user, 101L);
        VoteCandidate c2 = candidate(session, place(21L), user, 102L);

        when(currentUserResolver.getCurrentUser()).thenReturn(user);
        when(groupAccessValidator.validateMember(1L, 1L)).thenReturn(member(user, GroupRole.MEMBER));
        when(voteSessionRepository.findByIdAndTravelGroupId(5L, 1L)).thenReturn(Optional.of(session));
        when(voteCandidateRepository.findByVoteSessionIdOrderByIdAsc(5L)).thenReturn(List.of(c1, c2));
        when(voteRepository.findByCandidateIdIn(anyList())).thenReturn(List.of(
                vote(c1, user, 3), vote(c2, user, 3))); // 동점

        assertThatThrownBy(() -> voteService.close(1L, 5L, new VoteCloseRequest(null)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    // --- helpers ---

    private User user(Long id) {
        User user = User.builder().email("u" + id + "@test.com").password("enc").name("user" + id).build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private TravelGroup group() {
        TravelGroup group = TravelGroup.builder()
                .title("Trip").destination("Seoul")
                .startDate(LocalDate.of(2026, 7, 1)).endDate(LocalDate.of(2026, 7, 3))
                .inviteCode("ABC123").status(GroupStatus.PLANNING)
                .build();
        ReflectionTestUtils.setField(group, "id", 1L);
        return group;
    }

    private Place place(Long id) {
        Place place = Place.builder()
                .googlePlaceId("g" + id).name("place" + id).address("주소")
                .latitude(37.0).longitude(127.0).types("cafe")
                .build();
        ReflectionTestUtils.setField(place, "id", id);
        return place;
    }

    private Schedule schedule(Place place, Long id) {
        Schedule schedule = Schedule.builder()
                .travelGroup(group()).place(place).scheduleDate(LocalDate.of(2026, 7, 1)).orderIndex(0)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .status(ScheduleStatus.PLANNED).createdBy(user(1L)).updatedBy(user(1L))
                .build();
        ReflectionTestUtils.setField(schedule, "id", id);
        return schedule;
    }

    private VoteSession openSession(User creator) {
        return sessionFor(schedule(place(5L), 10L), creator);
    }

    private VoteSession sessionFor(Schedule schedule, User creator) {
        VoteSession session = VoteSession.builder()
                .travelGroup(group()).schedule(schedule).title("투표").closesAt(null).createdBy(creator)
                .build();
        ReflectionTestUtils.setField(session, "id", 5L);
        return session;
    }

    private VoteCandidate candidate(VoteSession session, Place place, User registrant, Long id) {
        VoteCandidate candidate = VoteCandidate.builder()
                .voteSession(session).place(place).registeredBy(registrant).memo(null)
                .build();
        ReflectionTestUtils.setField(candidate, "id", id);
        return candidate;
    }

    private Vote vote(VoteCandidate candidate, User voter, int score) {
        return Vote.builder().candidate(candidate).voter(voter).score(score).build();
    }

    private GroupMember member(User user, GroupRole role) {
        GroupMember member = GroupMember.builder().travelGroup(group()).user(user).role(role).build();
        ReflectionTestUtils.setField(member, "id", user.getId());
        return member;
    }
}
