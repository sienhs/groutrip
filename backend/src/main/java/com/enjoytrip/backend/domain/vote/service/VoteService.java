package com.enjoytrip.backend.domain.vote.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.place.controller.PlacePhotoController;
import com.enjoytrip.backend.domain.place.dto.PlaceResponse;
import com.enjoytrip.backend.domain.place.entity.Place;
import com.enjoytrip.backend.domain.place.repository.PlaceRepository;
import com.enjoytrip.backend.domain.schedule.entity.Schedule;
import com.enjoytrip.backend.domain.schedule.repository.ScheduleRepository;
import com.enjoytrip.backend.domain.vote.dto.CandidateRegisterRequest;
import com.enjoytrip.backend.domain.vote.dto.CandidateResponse;
import com.enjoytrip.backend.domain.vote.dto.CandidateResponse.VoterScore;
import com.enjoytrip.backend.domain.vote.dto.VoteCastRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteCloseRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteSessionCreateRequest;
import com.enjoytrip.backend.domain.vote.dto.VoteSessionResponse;
import com.enjoytrip.backend.domain.vote.entity.Vote;
import com.enjoytrip.backend.domain.vote.entity.VoteCandidate;
import com.enjoytrip.backend.domain.vote.entity.VoteSession;
import com.enjoytrip.backend.domain.vote.entity.VoteStatus;
import com.enjoytrip.backend.domain.vote.repository.VoteCandidateRepository;
import com.enjoytrip.backend.domain.vote.repository.VoteRepository;
import com.enjoytrip.backend.domain.vote.repository.VoteSessionRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

/**
 * FR-VOTE-01~04: 투표 세션 생성, 후보 등록, 투표, 마감/채택, 결과 집계.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class VoteService {

    private static final int MAX_CANDIDATES_PER_USER = 5; // FR-VOTE-01: 멤버당 1~5개

    private final VoteSessionRepository voteSessionRepository;
    private final VoteCandidateRepository voteCandidateRepository;
    private final VoteRepository voteRepository;
    private final ScheduleRepository scheduleRepository;
    private final PlaceRepository placeRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * FR-VOTE-01: 일정 슬롯에 투표 세션을 연다. 대상 일정은 VOTING 상태가 된다.
     */
    public VoteSessionResponse createSession(Long groupId, Long scheduleId, VoteSessionCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());

        Schedule schedule = scheduleRepository.findByIdAndTravelGroupId(scheduleId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));
        if (voteSessionRepository.existsByScheduleIdAndStatus(scheduleId, VoteStatus.OPEN)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // 이미 진행 중인 투표가 있음
        }

        VoteSession session = voteSessionRepository.save(VoteSession.builder()
                .travelGroup(schedule.getTravelGroup())
                .schedule(schedule)
                .title(request.title())
                .closesAt(request.closesAt())
                .createdBy(user)
                .build());
        schedule.markVoting(user);

        return buildResponse(session, user.getId());
    }

    /**
     * FR-VOTE-01: 후보 장소 등록. 멤버당 최대 5개까지 등록할 수 있다.
     */
    public VoteSessionResponse registerCandidate(Long groupId, Long sessionId, CandidateRegisterRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        VoteSession session = findOpenSession(groupId, sessionId);

        if (voteCandidateRepository.countByVoteSessionIdAndRegisteredById(sessionId, user.getId()) >= MAX_CANDIDATES_PER_USER) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        Place place = placeRepository.findById(request.placeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_NOT_FOUND));

        voteCandidateRepository.save(VoteCandidate.builder()
                .voteSession(session)
                .place(place)
                .registeredBy(user)
                .memo(request.memo())
                .build());

        return buildResponse(session, user.getId());
    }

    /**
     * FR-VOTE-02: 후보에 1~5점을 부여한다. 재투표 시 점수를 갱신한다.
     */
    public VoteSessionResponse castVote(Long groupId, Long sessionId, VoteCastRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        VoteSession session = findOpenSession(groupId, sessionId);

        VoteCandidate candidate = voteCandidateRepository.findByIdAndVoteSessionId(request.candidateId(), sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_CANDIDATE_NOT_FOUND));
        int score = request.score();
        if (score < 1 || score > 5) {
            throw new BusinessException(ErrorCode.VOTE_SCORE_INVALID);
        }

        voteRepository.findByCandidateIdAndVoterId(candidate.getId(), user.getId())
                .ifPresentOrElse(
                        vote -> vote.updateScore(score),
                        () -> voteRepository.save(Vote.builder()
                                .candidate(candidate).voter(user).score(score).build()));

        VoteSessionResponse response = buildResponse(session, user.getId());
        eventPublisher.publishEvent(DomainEvent.of(EventType.VOTE_CAST, groupId, user.getId(), response));
        return response;
    }

    /**
     * FR-VOTE-04: 투표 세션 결과 조회.
     */
    @Transactional(readOnly = true)
    public VoteSessionResponse getSession(Long groupId, Long sessionId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        VoteSession session = voteSessionRepository.findByIdAndTravelGroupId(sessionId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_SESSION_NOT_FOUND));
        return buildResponse(session, user.getId());
    }

    /**
     * FR-VOTE-04: 일정에 속한 투표 세션 목록(최신순).
     */
    @Transactional(readOnly = true)
    public List<VoteSessionResponse> getSessionsBySchedule(Long groupId, Long scheduleId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        scheduleRepository.findByIdAndTravelGroupId(scheduleId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));

        return voteSessionRepository.findByScheduleIdOrderByIdDesc(scheduleId).stream()
                .map(session -> buildResponse(session, user.getId()))
                .toList();
    }

    /**
     * FR-VOTE-03: 투표 마감/채택.
     * candidateId가 있으면 수동 채택, 없으면 최다 득표 후보를 자동 채택(동점이면 수동 선택 필요)한다.
     * Owner 또는 세션 생성자/후보 등록자만 마감할 수 있다.
     */
    public VoteSessionResponse close(Long groupId, Long sessionId, VoteCloseRequest request) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember member = groupAccessValidator.validateMember(groupId, user.getId());
        VoteSession session = voteSessionRepository.findByIdAndTravelGroupId(sessionId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_SESSION_NOT_FOUND));
        if (!session.isOpen()) {
            throw new BusinessException(ErrorCode.VOTE_ALREADY_CLOSED);
        }

        List<VoteCandidate> candidates = voteCandidateRepository.findByVoteSessionIdOrderByIdAsc(sessionId);
        if (candidates.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        validateCloser(session, member, candidates, user.getId());

        VoteCandidate winner = determineWinner(candidates, request.candidateId());
        session.getSchedule().adoptPlace(winner.getPlace(), user);
        session.close(winner.getId());

        VoteSessionResponse response = buildResponse(session, user.getId());
        eventPublisher.publishEvent(DomainEvent.of(EventType.VOTE_CLOSED, groupId, user.getId(), response));
        return response;
    }

    private VoteSession findOpenSession(Long groupId, Long sessionId) {
        VoteSession session = voteSessionRepository.findByIdAndTravelGroupId(sessionId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_SESSION_NOT_FOUND));
        if (!session.isOpen()) {
            throw new BusinessException(ErrorCode.VOTE_ALREADY_CLOSED);
        }
        return session;
    }

    // FR-VOTE-03: 투표를 연 사람(세션 생성자)만 마감/채택할 수 있다. Owner는 관리 차원의 예외로 허용.
    private void validateCloser(VoteSession session, GroupMember member,
                                List<VoteCandidate> candidates, Long userId) {
        boolean allowed = session.getCreatedBy().getId().equals(userId) || member.isOwner();
        if (!allowed) {
            throw new BusinessException(ErrorCode.GROUP_OWNER_REQUIRED);
        }
    }

    // 수동 채택이면 해당 후보, 아니면 최다 득표 후보. 자동 채택에서 동점이면 수동 선택을 요구한다.
    private VoteCandidate determineWinner(List<VoteCandidate> candidates, Long requestedCandidateId) {
        if (requestedCandidateId != null) {
            return candidates.stream()
                    .filter(c -> c.getId().equals(requestedCandidateId))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_CANDIDATE_NOT_FOUND));
        }

        Map<Long, Integer> totals = totalScoresByCandidate(candidates);
        int maxScore = totals.values().stream().max(Integer::compareTo).orElse(0);
        List<Long> topCandidateIds = totals.entrySet().stream()
                .filter(entry -> entry.getValue() == maxScore)
                .map(Map.Entry::getKey)
                .toList();
        if (topCandidateIds.size() != 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // 동점 → Owner 수동 선택 필요
        }

        Long winnerId = topCandidateIds.get(0);
        return candidates.stream()
                .filter(c -> c.getId().equals(winnerId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.VOTE_CANDIDATE_NOT_FOUND));
    }

    private Map<Long, Integer> totalScoresByCandidate(List<VoteCandidate> candidates) {
        List<Long> candidateIds = candidates.stream().map(VoteCandidate::getId).toList();
        Map<Long, Integer> totals = candidates.stream()
                .collect(Collectors.toMap(VoteCandidate::getId, c -> 0));
        for (Vote vote : voteRepository.findByCandidateIdIn(candidateIds)) {
            totals.merge(vote.getCandidate().getId(), vote.getScore(), Integer::sum);
        }
        return totals;
    }

    private VoteSessionResponse buildResponse(VoteSession session, Long currentUserId) {
        List<VoteCandidate> candidates = voteCandidateRepository.findByVoteSessionIdOrderByIdAsc(session.getId());
        List<Long> candidateIds = candidates.stream().map(VoteCandidate::getId).toList();
        List<Vote> votes = candidateIds.isEmpty() ? List.of() : voteRepository.findByCandidateIdIn(candidateIds);
        Map<Long, List<Vote>> votesByCandidate = votes.stream()
                .collect(Collectors.groupingBy(vote -> vote.getCandidate().getId()));
        boolean hasVoted = votes.stream().anyMatch(vote -> vote.getVoter().getId().equals(currentUserId));

        List<CandidateResponse> candidateResponses = candidates.stream()
                .map(candidate -> toCandidateResponse(candidate, votesByCandidate.getOrDefault(candidate.getId(), List.of())))
                .toList();

        return new VoteSessionResponse(
                session.getId(),
                session.getSchedule().getId(),
                session.getTitle(),
                session.getStatus(),
                session.getClosesAt(),
                session.getCreatedBy().getId(),
                session.getWinnerCandidateId(),
                hasVoted,
                candidateResponses
        );
    }

    private CandidateResponse toCandidateResponse(VoteCandidate candidate, List<Vote> votes) {
        int totalScore = votes.stream().mapToInt(Vote::getScore).sum();
        List<VoterScore> voters = votes.stream()
                .map(vote -> new VoterScore(vote.getVoter().getId(), vote.getVoter().getName(), vote.getScore()))
                .toList();
        Place place = candidate.getPlace();
        String photoUrl = place.getPhotoName() == null ? null : PlacePhotoController.proxyUrl(place.getPhotoName());
        return new CandidateResponse(
                candidate.getId(),
                PlaceResponse.from(place, photoUrl),
                candidate.getRegisteredBy().getId(),
                candidate.getRegisteredBy().getName(),
                candidate.getMemo(),
                totalScore,
                votes.size(),
                voters
        );
    }
}
