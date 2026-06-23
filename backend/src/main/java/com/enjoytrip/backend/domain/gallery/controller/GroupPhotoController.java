package com.enjoytrip.backend.domain.gallery.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.gallery.dto.GroupPhotoResponse;
import com.enjoytrip.backend.domain.gallery.service.GroupPhotoService;
import com.enjoytrip.backend.domain.gallery.service.GroupPhotoService.PhotoData;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 그룹 사진 갤러리 API. 모든 진입점은 그룹 멤버 권한이 필요하다.
 */
@RestController
@RequestMapping("/api/groups/{groupId}/photos")
@RequiredArgsConstructor
@Tag(name = "Group Photo", description = "그룹 사진 갤러리 API")
public class GroupPhotoController {

    private final GroupPhotoService groupPhotoService;

    @RequiredGroupMember
    @GetMapping
    @Operation(summary = "갤러리 목록", description = "그룹 사진 목록(최근순).")
    public ResponseEntity<ApiResponse<List<GroupPhotoResponse>>> list(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("그룹 사진 조회 성공", groupPhotoService.list(groupId)));
    }

    @RequiredGroupMember
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "사진 업로드", description = "멤버가 그룹 갤러리에 사진을 올린다(그룹당 최대 30장, 장당 5MB).")
    public ResponseEntity<ApiResponse<GroupPhotoResponse>> upload(
            @PathVariable Long groupId,
            @RequestParam MultipartFile photo
    ) {
        return ResponseEntity.ok(ApiResponse.success("사진을 올렸습니다.", groupPhotoService.upload(groupId, photo)));
    }

    @RequiredGroupMember
    @DeleteMapping("/{photoId}")
    @Operation(summary = "사진 삭제", description = "업로더 또는 Owner가 사진을 삭제한다.")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long groupId, @PathVariable Long photoId) {
        groupPhotoService.delete(groupId, photoId);
        return ResponseEntity.ok(ApiResponse.success("사진을 삭제했습니다."));
    }

    @RequiredGroupMember
    @GetMapping("/{photoId}/image")
    @Operation(summary = "사진 이미지", description = "그룹 멤버가 사진 이미지를 조회한다(인증 필요).")
    public ResponseEntity<byte[]> image(@PathVariable Long groupId, @PathVariable Long photoId) {
        PhotoData data = groupPhotoService.loadImage(groupId, photoId);
        MediaType mediaType = data.contentType() == null
                ? MediaType.IMAGE_JPEG
                : MediaType.parseMediaType(data.contentType());
        return ResponseEntity.ok().contentType(mediaType).body(data.data());
    }
}
