package com.enjoytrip.backend.domain.shopping.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shopping_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShoppingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by", nullable = false)
    private User addedBy;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String quantity;

    @Column(nullable = false)
    private boolean isChecked = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ShoppingItem(TravelGroup group, User addedBy, String name, String quantity) {
        this.group = group;
        this.addedBy = addedBy;
        this.name = name;
        this.quantity = quantity;
    }

    public void toggleChecked() {
        this.isChecked = !this.isChecked;
    }

    public boolean isOwnedBy(Long userId) {
        return this.addedBy.getId().equals(userId);
    }
}
