package com.enjoytrip.backend.domain.place.client;

import java.util.List;

/**
 * Google Text Search 한 페이지 응답.
 * {@code nextPageToken}이 있으면 다음 페이지를 요청할 수 있다(없으면 마지막 페이지).
 */
public record GooglePlacePage(
        List<GooglePlace> places,
        String nextPageToken
) {
}
