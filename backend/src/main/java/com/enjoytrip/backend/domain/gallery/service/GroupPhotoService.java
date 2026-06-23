package com.enjoytrip.backend.domain.gallery.service;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.gallery.dto.GroupPhotoResponse;
import com.enjoytrip.backend.domain.gallery.entity.GroupPhoto;
import com.enjoytrip.backend.domain.gallery.repository.GroupPhotoRepository;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.storage.ObjectStorageService;

import lombok.RequiredArgsConstructor;

/**
 * 그룹 사진 갤러리 — 멤버 누구나 업로드(그룹당 최대 30장), 삭제는 업로더 또는 Owner.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class GroupPhotoService {

    private static final int MAX_PHOTOS_PER_GROUP = 30;
    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5MB
    private static final String STORAGE_PREFIX = "group-photos";

    private final GroupPhotoRepository groupPhotoRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ObjectStorageService objectStorage;

    @Transactional(readOnly = true)
    public List<GroupPhotoResponse> list(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        return groupPhotoRepository.findByTravelGroupIdOrderByCreatedAtDesc(groupId).stream()
                .map(photo -> GroupPhotoResponse.from(photo, imageUrl(groupId, photo.getId())))
                .toList();
    }

    public GroupPhotoResponse upload(Long groupId, MultipartFile file) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (groupPhotoRepository.countByTravelGroupId(groupId) >= MAX_PHOTOS_PER_GROUP) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // 그룹당 30장 초과
        }
        validateImage(file);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        String objectKey = objectStorage.upload(STORAGE_PREFIX, bytes, file.getContentType());
        GroupPhoto photo = groupPhotoRepository.save(GroupPhoto.builder()
                .travelGroup(group)
                .uploadedBy(user)
                .contentType(file.getContentType())
                .objectKey(objectKey)
                .build());
        return GroupPhotoResponse.from(photo, imageUrl(groupId, photo.getId()));
    }

    public void delete(Long groupId, Long photoId) {
        User user = currentUserResolver.getCurrentUser();
        GroupMember actor = groupAccessValidator.validateMember(groupId, user.getId());
        GroupPhoto photo = groupPhotoRepository.findByIdAndTravelGroupId(photoId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!photo.isUploadedBy(user.getId()) && !actor.isOwner()) {
            throw new BusinessException(ErrorCode.GROUP_OWNER_REQUIRED);
        }
        groupPhotoRepository.delete(photo);
        objectStorage.delete(photo.getObjectKey());
    }

    @Transactional(readOnly = true)
    public PhotoData loadImage(Long groupId, Long photoId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        GroupPhoto photo = groupPhotoRepository.findByIdAndTravelGroupId(photoId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return new PhotoData(objectStorage.download(photo.getObjectKey()), photo.getContentType());
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE);
        }
    }

    private String imageUrl(Long groupId, Long photoId) {
        return "/api/groups/" + groupId + "/photos/" + photoId + "/image";
    }

    public record PhotoData(byte[] data, String contentType) {
    }
}
