package com.enjoytrip.backend.domain.group.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupOwner;
import com.enjoytrip.backend.domain.group.dto.GroupCreateRequest;
import com.enjoytrip.backend.domain.group.dto.GroupResponse;
import com.enjoytrip.backend.domain.group.service.GroupService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    // FR-GROUP-01: 로그인 사용자가 새 여행 그룹을 생성한다.
    @PostMapping
    public ResponseEntity<ApiResponse<GroupResponse>> create(@RequestBody @Valid GroupCreateRequest request) {
        GroupResponse response = groupService.create(request);
        return ResponseEntity.ok(ApiResponse.success("Group created.", response));
    }

    // FR-GROUP-03: 초대코드로 그룹에 참여한다.
    @PostMapping("/join/{inviteCode}")
    public ResponseEntity<ApiResponse<GroupResponse>> join(@PathVariable String inviteCode) {
        GroupResponse response = groupService.joinByInviteCode(inviteCode);
        return ResponseEntity.ok(ApiResponse.success("Joined group.", response));
    }

    // FR-GROUP-07: Owner만 초대코드를 재발급할 수 있고, 응답의 inviteCode가 새 코드가 된다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}/invite-code")
    public ResponseEntity<ApiResponse<GroupResponse>> regenerateInviteCode(@PathVariable Long groupId) {
        GroupResponse response = groupService.regenerateInviteCode(groupId);
        return ResponseEntity.ok(ApiResponse.success("Invite code regenerated.", response));
    }

    // AOP 멤버 권한 검증이 실제로 동작하는지 확인하기 위한 임시 엔드포인트이다.
    @RequiredGroupMember
    @PostMapping("/{groupId}/permission-check")
    public ResponseEntity<ApiResponse<Void>> permissionCheck(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("Group member permission check passed."));
    }
}
