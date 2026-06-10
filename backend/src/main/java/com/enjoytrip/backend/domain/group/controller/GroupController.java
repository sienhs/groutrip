package com.enjoytrip.backend.domain.group.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupOwner;
import com.enjoytrip.backend.domain.group.dto.GroupCreateRequest;
import com.enjoytrip.backend.domain.group.dto.GroupMemberResponse;
import com.enjoytrip.backend.domain.group.dto.GroupResponse;
import com.enjoytrip.backend.domain.group.dto.GroupUpdateRequest;
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

    // FR-GROUP-02: 그룹 멤버만 그룹 상세 기본 정보를 조회할 수 있다.
    @RequiredGroupMember
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupResponse>> findGroupDetail(@PathVariable Long groupId) {
        GroupResponse response = groupService.findGroupDetail(groupId);
        return ResponseEntity.ok(ApiResponse.success("Group detail found.", response));
    }

    // FR-GROUP-04: Owner만 그룹 제목, 목적지, 여행 기간, 커버 이미지를 수정할 수 있다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupResponse>> updateGroupInfo(
            @PathVariable Long groupId,
            @RequestBody @Valid GroupUpdateRequest request
    ) {
        GroupResponse response = groupService.updateGroupInfo(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Group updated.", response));
    }

    // FR-GROUP-05: 그룹 멤버만 현재 활성 멤버 목록을 조회할 수 있다.
    @RequiredGroupMember
    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<GroupMemberResponse>>> findGroupMembers(@PathVariable Long groupId) {
        List<GroupMemberResponse> response = groupService.findGroupMembers(groupId);
        return ResponseEntity.ok(ApiResponse.success("Group members found.", response));
    }

    // FR-GROUP-05: 일반 멤버는 그룹을 나갈 수 있고, Owner는 위임 또는 해체 전에는 나갈 수 없다.
    @RequiredGroupMember
    @DeleteMapping("/{groupId}/members/me")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(@PathVariable Long groupId) {
        groupService.leaveGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success("Left group."));
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
