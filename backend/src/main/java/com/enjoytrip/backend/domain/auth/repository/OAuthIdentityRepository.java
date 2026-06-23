package com.enjoytrip.backend.domain.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.auth.entity.OAuthIdentity;
import com.enjoytrip.backend.domain.auth.entity.OAuthProvider;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {

	@EntityGraph(attributePaths = "user")
	Optional<OAuthIdentity> findByProviderAndProviderUserId(OAuthProvider provider, String providerUserId);
}
