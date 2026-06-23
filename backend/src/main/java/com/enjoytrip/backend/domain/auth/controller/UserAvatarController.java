package com.enjoytrip.backend.domain.auth.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.auth.service.UserAvatarService;
import com.enjoytrip.backend.domain.auth.service.UserAvatarService.AvatarData;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 프로필 사진 API. 업로드는 인증 필요, 조회(/avatar)는 <img src> 직접 로드를 위해 공개한다.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Avatar", description = "프로필 사진 API")
public class UserAvatarController {

    private final UserAvatarService userAvatarService;

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "내 프로필 사진 업로드", description = "내 프로필 사진을 올리거나 교체한다(5MB 이하).")
    public ResponseEntity<ApiResponse<Void>> uploadMyAvatar(@RequestParam MultipartFile avatar) {
        userAvatarService.uploadMyAvatar(avatar);
        return ResponseEntity.ok(ApiResponse.success("프로필 사진을 등록했습니다."));
    }

    @GetMapping("/{userId}/avatar")
    @Operation(summary = "프로필 사진 조회", description = "사용자 프로필 사진을 조회한다(없으면 404).")
    public ResponseEntity<byte[]> avatar(@PathVariable Long userId) {
        AvatarData data = userAvatarService.loadAvatar(userId);
        MediaType mediaType = data.contentType() == null
                ? MediaType.IMAGE_JPEG
                : MediaType.parseMediaType(data.contentType());
        return ResponseEntity.ok().contentType(mediaType).body(data.data());
    }
}
