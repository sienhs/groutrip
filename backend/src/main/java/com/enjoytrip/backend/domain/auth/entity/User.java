package com.enjoytrip.backend.domain.auth.entity;

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
}


