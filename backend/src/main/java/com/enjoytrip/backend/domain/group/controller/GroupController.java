package com.enjoytrip.backend.domain.group.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupOwner;
import com.enjoytrip.backend.domain.group.service.GroupService.CoverData;
import com.enjoytrip.backend.domain.group.dto.GroupCreateRequest;
import com.enjoytrip.backend.domain.group.dto.GroupMemberResponse;
import com.enjoytrip.backend.domain.group.dto.GroupPinRequest;
import com.enjoytrip.backend.domain.group.dto.GroupResponse;
import com.enjoytrip.backend.domain.group.dto.GroupUpdateRequest;
import com.enjoytrip.backend.domain.group.service.GroupService;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Tag(name = "Group", description = "여행 그룹 생성, 참여, 조회, 정보 수정, 멤버 관리 API")
public class GroupController {

    private final GroupService groupService;

    // FR-GROUP-01: 로그인한 사용자가 여행 그룹을 생성하고 자동으로 Owner가 된다.
    @PostMapping
    @Operation(
            summary = "그룹 생성",
            description = """
                    FR-GROUP-01: 로그인한 사용자가 새 여행 그룹을 생성한다.
                    생성자는 자동으로 Owner 멤버가 되며, 서버가 6자리 초대 코드를 생성한다.
                    여행 시작일은 종료일보다 늦을 수 없고 전체 여행 기간은 최대 30일이다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupResponse>> create(@RequestBody @Valid GroupCreateRequest request) {
        GroupResponse response = groupService.create(request);
        return ResponseEntity.ok(ApiResponse.success("Group created.", response));
    }

    // FR-GROUP-02: 로그인한 사용자가 현재 참여 중인 그룹 목록을 조회한다.
    @GetMapping
    @Operation(
            summary = "내 그룹 목록 조회",
            description = """
                    FR-GROUP-02: 현재 사용자가 활성 멤버로 참여 중인 그룹만 조회한다.
                    삭제된 그룹은 제외하며, 진행 중 그룹, 가까운 예정 그룹, 최근 완료 그룹 순으로 반환한다.
                    """
    )
    public ResponseEntity<ApiResponse<List<GroupResponse>>> findMyGroups() {
        List<GroupResponse> response = groupService.findMyGroups();
        return ResponseEntity.ok(ApiResponse.success("Groups found.", response));
    }

    // FR-GROUP-03: 초대 코드로 그룹에 참여한다.
    @PostMapping("/join/{inviteCode}")
    @Operation(
            summary = "초대 코드로 그룹 참여",
            description = """
                    FR-GROUP-03: 6자리 초대 코드로 기존 여행 그룹에 참여한다.
                    이미 참여 중인 그룹이면 중복 참여를 막고, 그룹 멤버가 8명을 초과하면 참여할 수 없다.
                    향후 SSE가 연결되면 MEMBER_JOINED 이벤트를 발행할 예정이다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupResponse>> join(
            @Parameter(description = "그룹 초대 코드", example = "A1B2C3")
            @PathVariable String inviteCode
    ) {
        GroupResponse response = groupService.joinByInviteCode(inviteCode);
        return ResponseEntity.ok(ApiResponse.success("Joined group.", response));
    }

    // FR-GROUP-02: 그룹 멤버만 그룹 상세 기본 정보를 조회할 수 있다.
    @RequiredGroupMember
    @GetMapping("/{groupId}")
    @Operation(
            summary = "그룹 상세 조회",
            description = """
                    FR-GROUP-02: 그룹 멤버가 특정 그룹의 기본 정보를 조회한다.
                    그룹 멤버가 아니거나 삭제된 그룹이면 접근할 수 없다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupResponse>> findGroupDetail(
            @Parameter(description = "조회할 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        GroupResponse response = groupService.findGroupDetail(groupId);
        return ResponseEntity.ok(ApiResponse.success("Group detail found.", response));
    }

    // FR-GROUP-04: Owner만 그룹 기본 정보를 수정할 수 있다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}")
    @Operation(
            summary = "그룹 정보 수정",
            description = """
                    FR-GROUP-04: Owner가 그룹 제목, 목적지, 여행 기간, 커버 이미지를 수정한다.
                    시작일 변경은 여행 시작 전까지만 허용하며, 종료일을 앞당길 때는 향후 일정 검증 계약과 연결될 예정이다.
                    수정 후 그룹 상태는 현재 날짜 기준으로 다시 계산된다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupResponse>> updateGroupInfo(
            @Parameter(description = "수정할 그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid GroupUpdateRequest request
    ) {
        GroupResponse response = groupService.updateGroupInfo(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Group updated.", response));
    }

    // FR-GROUP-04: Owner가 커스텀 커버 이미지를 업로드한다.
    @RequiredGroupOwner
    @PostMapping(value = "/{groupId}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "그룹 커버 이미지 업로드", description = "Owner가 그룹 커버를 직접 올린다(5MB 이하). coverImageKey가 CUSTOM이 된다.")
    public ResponseEntity<ApiResponse<GroupResponse>> uploadCover(
            @PathVariable Long groupId,
            @RequestParam MultipartFile cover
    ) {
        return ResponseEntity.ok(ApiResponse.success("커버 이미지를 등록했습니다.", groupService.uploadCover(groupId, cover)));
    }

    // 커버 이미지는 <img src>로 여러 화면에서 직접 로드되므로 조회는 공개한다.
    @GetMapping("/{groupId}/cover")
    @Operation(summary = "그룹 커버 이미지 조회", description = "커스텀 커버 이미지를 조회한다(없으면 404).")
    public ResponseEntity<byte[]> cover(@PathVariable Long groupId) {
        CoverData data = groupService.loadCover(groupId);
        MediaType mediaType = data.contentType() == null
                ? MediaType.IMAGE_JPEG
                : MediaType.parseMediaType(data.contentType());
        return ResponseEntity.ok().contentType(mediaType).body(data.data());
    }

    // FR-GROUP-05: 그룹 멤버가 현재 활성 멤버 목록을 조회한다.
    @RequiredGroupMember
    @GetMapping("/{groupId}/members")
    @Operation(
            summary = "그룹 멤버 목록 조회",
            description = """
                    FR-GROUP-05: 그룹 멤버가 현재 활성 멤버 목록을 조회한다.
                    응답에는 사용자 ID, 이름, 그룹 역할, 가입일이 포함된다.
                    """
    )
    public ResponseEntity<ApiResponse<List<GroupMemberResponse>>> findGroupMembers(
            @Parameter(description = "멤버 목록을 조회할 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        List<GroupMemberResponse> response = groupService.findGroupMembers(groupId);
        return ResponseEntity.ok(ApiResponse.success("Group members found.", response));
    }

    // FR-GROUP-05: 일반 멤버는 그룹을 나갈 수 있고 Owner는 바로 나갈 수 없다.
    @RequiredGroupMember
    @DeleteMapping("/{groupId}/members/me")
    @Operation(
            summary = "그룹 나가기",
            description = """
                    FR-GROUP-05: 일반 멤버가 그룹을 나간다.
                    Owner는 바로 나갈 수 없으며, 먼저 Owner를 이전하거나 그룹을 해체해야 한다.
                    나가기 처리는 작성 데이터 보존을 위해 멤버십을 soft delete 방식으로 비활성화한다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @Parameter(description = "나갈 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        groupService.leaveGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success("Left group."));
    }

    // FR-GROUP-05: Owner가 일반 멤버를 강퇴한다.
    @RequiredGroupOwner
    @DeleteMapping("/{groupId}/members/{targetUserId}")
    @Operation(
            summary = "그룹 멤버 강퇴",
            description = """
                    FR-GROUP-05: Owner가 일반 멤버를 그룹에서 내보낸다.
                    Owner 자신이나 다른 Owner 대상 강퇴는 허용하지 않는다.
                    강퇴 이력은 leftAt으로 남겨 비용/정산 등 기존 작성 데이터와 연결을 유지한다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> kickMember(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "강퇴할 사용자 ID", example = "2")
            @PathVariable Long targetUserId
    ) {
        groupService.kickMember(groupId, targetUserId);
        return ResponseEntity.ok(ApiResponse.success("Member kicked."));
    }

    // FR-GROUP-05: Owner 권한을 다른 활성 멤버에게 이전한다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}/owner/{targetUserId}")
    @Operation(
            summary = "Owner 권한 이전",
            description = """
                    FR-GROUP-05: 현재 Owner가 그룹의 다른 활성 멤버에게 Owner 권한을 이전한다.
                    기존 Owner는 MEMBER 역할로 내려가며, 대상 멤버가 이미 Owner이면 요청을 거절한다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> transferOwner(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "새 Owner가 될 사용자 ID", example = "2")
            @PathVariable Long targetUserId
    ) {
        groupService.transferOwner(groupId, targetUserId);
        return ResponseEntity.ok(ApiResponse.success("Group owner transferred."));
    }

    // FR-GROUP-06: Owner가 그룹을 해체하고 그룹과 멤버십을 soft delete 처리한다.
    @RequiredGroupOwner
    @DeleteMapping("/{groupId}")
    @Operation(
            summary = "그룹 해체",
            description = """
                    FR-GROUP-06: Owner가 그룹을 해체한다.
                    그룹과 활성 멤버십을 soft delete 처리하며, 실제 데이터 hard delete는 30일 후 배치 대상으로 남긴다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> dissolveGroup(
            @Parameter(description = "해체할 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        groupService.dissolveGroup(groupId);
        return ResponseEntity.ok(ApiResponse.success("Group dissolved."));
    }

    // 채팅 허브 상단 고정 공지 설정(Owner 전용). 게시판 공지글 또는 진행중 투표를 고정한다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}/pin")
    @Operation(summary = "상단 고정 공지 설정", description = "Owner가 게시판 공지글(POST) 또는 진행중 투표(VOTE)를 채팅 상단에 고정한다.")
    public ResponseEntity<ApiResponse<GroupResponse>> pinNotice(
            @PathVariable Long groupId,
            @RequestBody @Valid GroupPinRequest request
    ) {
        GroupResponse response = groupService.pinNotice(groupId, request.type(), request.refId(), request.title());
        return ResponseEntity.ok(ApiResponse.success("공지를 고정했습니다.", response));
    }

    // 상단 고정 공지 해제(Owner 전용).
    @RequiredGroupOwner
    @DeleteMapping("/{groupId}/pin")
    @Operation(summary = "상단 고정 공지 해제", description = "Owner가 채팅 상단 고정 공지를 해제한다.")
    public ResponseEntity<ApiResponse<GroupResponse>> clearPinnedNotice(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("공지 고정을 해제했습니다.", groupService.clearPinnedNotice(groupId)));
    }

    // FR-GROUP-07: Owner가 초대 코드를 재발급한다.
    @RequiredGroupOwner
    @PatchMapping("/{groupId}/invite-code")
    @Operation(
            summary = "초대 코드 재발급",
            description = """
                    FR-GROUP-07: Owner가 그룹 초대 코드를 새로 발급한다.
                    새 코드가 저장되는 즉시 기존 초대 코드는 더 이상 사용할 수 없다.
                    """
    )
    public ResponseEntity<ApiResponse<GroupResponse>> regenerateInviteCode(
            @Parameter(description = "초대 코드를 재발급할 그룹 ID", example = "1")
            @PathVariable Long groupId
    ) {
        GroupResponse response = groupService.regenerateInviteCode(groupId);
        return ResponseEntity.ok(ApiResponse.success("Invite code regenerated.", response));
    }

}
