package com.enjoytrip.backend.domain.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @EntityGraph(attributePaths = {"travelGroup", "recipient"})
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    @EntityGraph(attributePaths = {"travelGroup", "recipient"})
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    List<Notification> findByRecipientIdAndReadAtIsNull(Long recipientId);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);
}
