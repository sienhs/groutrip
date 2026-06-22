package com.enjoytrip.backend.domain.place.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.place.entity.Place;

public interface PlaceRepository extends JpaRepository<Place, Long> {

    // FR-PLACE-02: 보관함 추가 시 Google placeId로 기존 장소 마스터를 재사용한다.
    Optional<Place> findByGooglePlaceId(String googlePlaceId);
}
