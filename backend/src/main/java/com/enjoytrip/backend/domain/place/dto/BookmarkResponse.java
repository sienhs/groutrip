package com.enjoytrip.backend.domain.place.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.place.entity.Bookmark;
import com.enjoytrip.backend.domain.place.entity.PlaceCategory;

/**
 * FR-PLACE-03: 보관함 조회 응답. 장소 마스터 정보와 그룹별 메모/태그/추가자 정보를 함께 노출한다.
 */
public record BookmarkResponse(
        Long id,
        PlaceResponse place,
        PlaceCategory categoryTag,
        String memo,
        Integer personalRating,
        Long createdById,
        String createdByName,
        LocalDateTime createdAt
) {

    public static BookmarkResponse from(Bookmark bookmark, String photoUrl) {
        return new BookmarkResponse(
                bookmark.getId(),
                PlaceResponse.from(bookmark.getPlace(), photoUrl),
                bookmark.getCategoryTag(),
                bookmark.getMemo(),
                bookmark.getPersonalRating(),
                bookmark.getCreatedBy().getId(),
                bookmark.getCreatedBy().getName(),
                bookmark.getCreatedAt()
        );
    }
}
