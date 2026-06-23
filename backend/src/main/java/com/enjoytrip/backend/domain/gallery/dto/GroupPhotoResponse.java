package com.enjoytrip.backend.domain.gallery.dto;

import java.time.LocalDateTime;

import com.enjoytrip.backend.domain.gallery.entity.GroupPhoto;

public record GroupPhotoResponse(
        Long id,
        Long uploadedById,
        String uploadedByName,
        String imageUrl,
        LocalDateTime createdAt
) {
    public static GroupPhotoResponse from(GroupPhoto photo, String imageUrl) {
        return new GroupPhotoResponse(
                photo.getId(),
                photo.getUploadedBy().getId(),
                photo.getUploadedBy().getName(),
                imageUrl,
                photo.getCreatedAt()
        );
    }
}
