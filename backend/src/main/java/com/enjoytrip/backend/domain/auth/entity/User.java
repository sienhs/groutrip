package com.enjoytrip.backend.domain.auth.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.entity.BaseEntity;
import com.enjoytrip.backend.global.crypto.PayoutCryptoConverter;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

	// 프로필 사진의 S3 object key. 실제 바이트는 ObjectStorageService로 key로 조회한다.
	@Column(name = "avatar_key", length = 255)
	private String avatarKey;

	@Column(name = "avatar_content_type", length = 100)
	private String avatarContentType;

	// FR-EXPENSE: 정산 받을 송금 링크(토스/카카오페이 URL)와 계좌(은행/계좌, 자유 텍스트). 둘 다 선택값.
	// 민감 개인정보라 DB에는 AES-GCM 암호문(Base64)으로 저장한다(@Convert) → 컬럼 길이를 넉넉히 둔다.
	@Convert(converter = PayoutCryptoConverter.class)
	@Column(name = "payout_link", length = 512)
	private String payoutLink;

	@Convert(converter = PayoutCryptoConverter.class)
	@Column(name = "payout_account", length = 512)
	private String payoutAccount;

	// 온보딩(개인정보 동의 등) 완료 여부. 계정당 1회만 노출하기 위해 서버에서 관리한다.
	@Column(nullable = false)
	private boolean onboarded;

	// 관리자 제재: 정지된 계정은 로그인/인증이 차단된다(친구들끼리 쓰는 장난용).
	@Column(nullable = false)
	private boolean banned;

	// 관리자 제재: 이름 옆에 강제로 붙는 장난 배지/칭호(예: "밥차톨"). null이면 없음.
	@Column(length = 30)
	private String badge;

	// FR-MYPAGE: 표시 이름을 변경한다.
	public void updateName(String name) {
		this.name = name;
	}

	// 관리자: 계정 정지/해제.
	public void setBanned(boolean banned) {
		this.banned = banned;
	}

	// 관리자: 장난 배지/칭호 설정(빈 값은 제거).
	public void setBadge(String badge) {
		this.badge = (badge == null || badge.isBlank()) ? null : badge.trim();
	}

	// 온보딩 완료 처리(다른 기기/재로그인 시 다시 노출되지 않도록).
	public void markOnboarded() {
		this.onboarded = true;
	}

	/** 정산 받을 링크/계좌 설정. 빈 문자열은 null로 정규화해 '미설정'으로 저장한다. */
	public void updatePayout(String payoutLink, String payoutAccount) {
		this.payoutLink = blankToNull(payoutLink);
		this.payoutAccount = blankToNull(payoutAccount);
	}

	private static String blankToNull(String v) {
		return (v == null || v.isBlank()) ? null : v.trim();
	}

	/** 프로필 사진 설정. avatarKey는 S3 object key. */
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


