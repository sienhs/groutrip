package com.enjoytrip.backend.domain.auth.service;

import java.io.IOException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;
import com.enjoytrip.backend.global.storage.ObjectStorageService;

import lombok.RequiredArgsConstructor;

/**
 * 사용자 프로필 사진 업로드/조회. 바이트는 S3에 저장하고 User에는 object key만 보관한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserAvatarService {

    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5MB
    private static final String STORAGE_PREFIX = "avatars";

    private final UserRepository userRepository;
    private final CurrentUserResolver currentUserResolver;
    private final ObjectStorageService objectStorage;

    /** 내 프로필 사진 업로드/교체. 기존 사진이 있으면 교체 후 삭제한다. */
    public void uploadMyAvatar(MultipartFile file) {
        User user = currentUserResolver.getCurrentUser();
        validateImage(file);
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
        String previousKey = user.getAvatarKey();
        String key = objectStorage.upload(STORAGE_PREFIX, bytes, file.getContentType());
        user.updateAvatar(key, file.getContentType());
        objectStorage.delete(previousKey);
    }

    /** 현재 로그인 사용자의 프로필 사진 로드. 없으면 404. */
    @Transactional(readOnly = true)
    public AvatarData loadMyAvatar() {
        User user = currentUserResolver.getCurrentUser();
        if (!user.hasAvatar()) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        return new AvatarData(objectStorage.download(user.getAvatarKey()), user.getAvatarContentType());
    }

    /** 프로필 사진 바이트 로드(공개 조회). 없으면 404. */
    @Transactional(readOnly = true)
    public AvatarData loadAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!user.hasAvatar()) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        return new AvatarData(objectStorage.download(user.getAvatarKey()), user.getAvatarContentType());
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

    public record AvatarData(byte[] data, String contentType) {
    }
}
