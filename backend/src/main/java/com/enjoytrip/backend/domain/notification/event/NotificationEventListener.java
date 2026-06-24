package com.enjoytrip.backend.domain.notification.event;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.notification.entity.Notification;
import com.enjoytrip.backend.domain.notification.repository.NotificationRepository;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    /**
     * 도메인 커밋 이후 별도 트랜잭션으로 알림을 저장한다.
     * actor 본인은 낙관적 업데이트와 중복되므로 수신 대상에서 제외한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDomainEvent(DomainEvent<?> event) {
        // 정산 변화는 SSE로 화면만 실시간 갱신하고, 벨 알림은 남기지 않는다(잦은 송금/수령 확인 소음 방지).
        if (event.type() == EventType.SETTLEMENT_UPDATED) {
            return;
        }
        boolean groupDissolved = isGroupDissolved(event);
        List<GroupMember> recipients = groupDissolved
                ? groupMemberRepository.findByTravelGroupId(event.groupId())
                : groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(event.groupId());
        if (recipients.isEmpty()) {
            return;
        }

        String actorName = event.actorId() == null
                ? "그룹 멤버"
                : userRepository.findById(event.actorId()).map(user -> user.getName()).orElse("그룹 멤버");
        String message = message(event.type(), actorName);
        String targetPath = targetPath(event.type(), event.groupId());

        List<Notification> notifications = recipients.stream()
                .filter(member -> groupDissolved || member.isActive())
                .filter(member -> event.actorId() == null || !member.getUser().getId().equals(event.actorId()))
                .map(member -> Notification.builder()
                        .travelGroup(member.getTravelGroup())
                        .recipient(member.getUser())
                        .type(event.type())
                        .message(message)
                        .targetPath(targetPath)
                        .build())
                .toList();

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    private boolean isGroupDissolved(DomainEvent<?> event) {
        return event.type() == EventType.GROUP_UPDATED
                && event.payload() instanceof Map<?, ?> payload
                && Boolean.TRUE.equals(payload.get("deleted"));
    }

    private String message(EventType type, String actorName) {
        return switch (type) {
            case SCHEDULE_ADDED -> actorName + "님이 일정을 추가했습니다.";
            case SCHEDULE_UPDATED, SCHEDULE_REORDERED -> actorName + "님이 일정을 변경했습니다.";
            case SCHEDULE_DELETED -> actorName + "님이 일정을 삭제했습니다.";
            case VOTE_CAST -> actorName + "님이 투표했습니다.";
            case VOTE_CLOSED -> actorName + "님이 투표를 마감했습니다.";
            case PLACE_BOOKMARKED -> actorName + "님이 장소를 추가했습니다.";
            case PLACE_REMOVED -> actorName + "님이 장소를 삭제했습니다.";
            case EXPENSE_ADDED -> actorName + "님이 지출을 등록했습니다.";
            case EXPENSE_UPDATED -> actorName + "님이 지출을 수정했습니다.";
            case EXPENSE_DELETED -> actorName + "님이 지출을 삭제했습니다.";
            case SETTLEMENT_UPDATED -> actorName + "님이 정산을 업데이트했습니다."; // 실제로는 위에서 early-return

            case MEMBER_JOINED -> actorName + "님이 그룹에 참여했습니다.";
            case MEMBER_LEFT -> "그룹 멤버가 나갔습니다.";
            case GROUP_UPDATED -> actorName + "님이 그룹 정보를 변경했습니다.";
        };
    }

    private String targetPath(EventType type, Long groupId) {
        String groupPath = "/groups/" + groupId;
        return switch (type) {
            case SCHEDULE_ADDED, SCHEDULE_UPDATED, SCHEDULE_DELETED, SCHEDULE_REORDERED,
                    VOTE_CAST, VOTE_CLOSED -> groupPath + "/schedules";
            case PLACE_BOOKMARKED, PLACE_REMOVED -> groupPath + "/places";
            case EXPENSE_ADDED, EXPENSE_UPDATED, EXPENSE_DELETED, SETTLEMENT_UPDATED -> groupPath + "/expenses";
            case MEMBER_JOINED, MEMBER_LEFT -> groupPath + "/members";
            case GROUP_UPDATED -> groupPath;
        };
    }
}
