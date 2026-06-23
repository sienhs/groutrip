package com.enjoytrip.backend.domain.auth.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class User extends BaseEntity {

	// DB의 auto increment | PostgreSQL은 SERIAL
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// DB레벨에서 중복 이메일 방지
	@Column(nullable = false, unique = true)
	private String email;

	// BCrypt로 암호화 된 값이 저장됨. 평문 x
	@Column(nullable = false)
	private String password;

	@Column(nullable = false)
	private String name;

	// FR-AUTH-06: 탈퇴 시각. null이면 활성 사용자, 값이 있으면 익명화된 탈퇴 사용자(30일 후 hard delete 대상).
	private LocalDateTime deletedAt;

	// 프로필 사진의 MinIO object key. 실제 바이트는 ObjectStorageService로 key로 조회한다.
	@Column(name = "avatar_key", length = 255)
	private String avatarKey;

	@Column(name = "avatar_content_type", length = 100)
	private String avatarContentType;

	// FR-AUTH-05: 새 비밀번호(BCrypt 해시)로 교체한다.
	public void changePassword(String encodedPassword) {
		this.password = encodedPassword;
	}

	/** 프로필 사진 설정. avatarKey는 MinIO object key. */
	public void updateAvatar(String avatarKey, String contentType) {
		this.avatarKey = avatarKey;
		this.avatarContentType = contentType;
	}

	public boolean hasAvatar() {
		return avatarKey != null && !avatarKey.isBlank();
	}

	// FR-AUTH-06: 개인정보를 즉시 익명화하고 탈퇴 시각을 기록한다. 작성 기록은 보존된다.
	public void withdraw() {
		this.name = "탈퇴한 사용자";
		this.deletedAt = LocalDateTime.now();
	}

	// 탈퇴 처리된 사용자인지 여부(로그인/인증 차단에 사용).
	public boolean isWithdrawn() {
		return this.deletedAt != null;
	}
}


