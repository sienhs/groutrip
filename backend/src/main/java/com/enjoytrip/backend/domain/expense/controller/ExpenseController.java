package com.enjoytrip.backend.domain.expense.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseSummaryResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseUpdateRequest;
import com.enjoytrip.backend.domain.expense.entity.ExpenseCategory;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/expenses")
@RequiredArgsConstructor
@Tag(name = "Expense", description = "그룹 지출 등록, 조회, 수정, 삭제 API")
public class ExpenseController {

    private final ExpenseService expenseService;

    // FR-EXPENSE-01/07: 그룹 멤버가 지출을 등록하고 참여자별 부담 금액을 생성한다.
    @RequiredGroupMember
    @PostMapping
    @Operation(
            summary = "지출 등록",
            description = """
                    FR-EXPENSE-01/07: 그룹 멤버가 지출 내역을 등록하고 참여자별 부담 금액을 생성한다.
                    금액은 1원 이상 100,000,000원 이하이며, 결제자와 참여자는 현재 그룹의 활성 멤버여야 한다.
                    EQUAL은 participantIds, RATIO/AMOUNT는 splitDetails로 참여자별 입력을 전달한다.
                    sourceScheduleId는 선택값이며, Part A 일정/이동 비용에서 확정된 금액을 정산에 연결할 때 사용한다.
                    """
    )
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
            @Parameter(description = "지출을 등록할 그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestBody @Valid ExpenseCreateRequest request
    ) {
        ExpenseResponse response = expenseService.create(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Expense saved.", response));
    }

    // FR-EXPENSE-02: 그룹 멤버가 그룹 지출 목록을 결제일 최신순으로 조회한다.
    @RequiredGroupMember
    @GetMapping
    @Operation(
            summary = "그룹 지출 목록 조회",
            description = """
                    FR-EXPENSE-02: 그룹 멤버가 그룹의 지출 목록을 조회한다.
                    응답은 결제일 최신순으로 내려오며, 각 지출에는 결제자, 작성자, 카테고리, 분담 방식, 참여자별 부담 금액이 포함된다.
                    """
    )
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> findGroupExpenses(
            @Parameter(description = "지출 목록을 조회할 그룹 ID", example = "1")
            @PathVariable Long groupId,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) Long payerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<ExpenseResponse> response = expenseService.findGroupExpenses(
                groupId,
                category,
                payerId,
                startDate,
                endDate
        );
        return ResponseEntity.ok(ApiResponse.success("Expenses found.", response));
    }

    // FR-EXPENSE-02: 목록과 동일한 필터로 합계 및 차트 데이터를 조회한다.
    @RequiredGroupMember
    @GetMapping("/summary")
    @Operation(
            summary = "그룹 지출 요약 조회",
            description = """
                    FR-EXPENSE-02: 선택한 카테고리, 결제자, 날짜 범위에 해당하는 총 지출액과
                    활성 멤버 기준 1인당 평균, 카테고리별 합계, 결제일별 합계를 반환한다.
                    """
    )
    public ResponseEntity<ApiResponse<ExpenseSummaryResponse>> summarize(
            @PathVariable Long groupId,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) Long payerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        ExpenseSummaryResponse response = expenseService.summarize(
                groupId,
                category,
                payerId,
                startDate,
                endDate
        );
        return ResponseEntity.ok(ApiResponse.success("Expense summary found.", response));
    }

    // FR-EXPENSE-03: 작성자 또는 Owner가 지출 정보와 분담 결과를 수정한다.
    @RequiredGroupMember
    @PatchMapping("/{expenseId}")
    @Operation(
            summary = "지출 수정",
            description = """
                    FR-EXPENSE-03: 지출 작성자 또는 그룹 Owner가 지출 정보와 분담 참여자를 수정한다.
                    수정 시 기존 분담 내역은 삭제 후 EQUAL/RATIO/AMOUNT 요청 기준으로 다시 생성되며, 정산 결과는 다음 조회부터 즉시 반영된다.
                    """
    )
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "수정할 지출 ID", example = "10")
            @PathVariable Long expenseId,
            @RequestBody @Valid ExpenseUpdateRequest request
    ) {
        ExpenseResponse response = expenseService.update(groupId, expenseId, request);
        return ResponseEntity.ok(ApiResponse.success("Expense updated.", response));
    }

    // FR-EXPENSE-03: 작성자 또는 Owner가 지출을 soft delete 처리한다.
    @RequiredGroupMember
    @DeleteMapping("/{expenseId}")
    @Operation(
            summary = "지출 삭제",
            description = """
                    FR-EXPENSE-03: 지출 작성자 또는 그룹 Owner가 지출을 삭제한다.
                    실제 레코드는 즉시 제거하지 않고 soft delete 처리해서 정산 이력 보존 정책과 충돌하지 않게 한다.
                    """
    )
    public ResponseEntity<ApiResponse<Void>> delete(
            @Parameter(description = "그룹 ID", example = "1")
            @PathVariable Long groupId,
            @Parameter(description = "삭제할 지출 ID", example = "10")
            @PathVariable Long expenseId
    ) {
        expenseService.delete(groupId, expenseId);
        return ResponseEntity.ok(ApiResponse.success("Expense deleted."));
    }
}
