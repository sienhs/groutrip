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

	// 프로필 사진(MinIO 미가동 환경이라 DB bytea 저장). 목록 조회 시 불필요한 blob 로딩을 피하려 LAZY.
	@jakarta.persistence.Basic(fetch = jakarta.persistence.FetchType.LAZY)
	@Column
	private byte[] avatar;

	@Column(name = "avatar_content_type", length = 100)
	private String avatarContentType;

	// FR-AUTH-05: 새 비밀번호(BCrypt 해시)로 교체한다.
	public void changePassword(String encodedPassword) {
		this.password = encodedPassword;
	}

	/** 프로필 사진 설정. */
	public void updateAvatar(byte[] avatar, String contentType) {
		this.avatar = avatar;
		this.avatarContentType = contentType;
	}

	public boolean hasAvatar() {
		return avatar != null && avatar.length > 0;
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


