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

import lombok.RequiredArgsConstructor;

/**
 * 사용자 프로필 사진 업로드/조회(DB bytea 저장).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserAvatarService {

    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5MB

    private final UserRepository userRepository;
    private final CurrentUserResolver currentUserResolver;

    /** 내 프로필 사진 업로드/교체. */
    public void uploadMyAvatar(MultipartFile file) {
        User user = currentUserResolver.getCurrentUser();
        validateImage(file);
        try {
            user.updateAvatar(file.getBytes(), file.getContentType());
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    /** 프로필 사진 바이트 로드(공개 조회). 없으면 404. */
    @Transactional(readOnly = true)
    public AvatarData loadAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!user.hasAvatar()) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        return new AvatarData(user.getAvatar(), user.getAvatarContentType());
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
