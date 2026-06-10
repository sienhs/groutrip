package com.enjoytrip.backend.domain.expense.controller;

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

import com.enjoytrip.backend.domain.expense.dto.ExpenseCreateRequest;
import com.enjoytrip.backend.domain.expense.dto.ExpenseResponse;
import com.enjoytrip.backend.domain.expense.dto.ExpenseUpdateRequest;
import com.enjoytrip.backend.domain.expense.service.ExpenseService;
import com.enjoytrip.backend.domain.group.aop.RequiredGroupMember;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    // FR-EXPENSE-01: 그룹 멤버는 지출을 등록하고 참여자별 분담 금액을 생성할 수 있다.
    @RequiredGroupMember
    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
            @PathVariable Long groupId,
            @RequestBody @Valid ExpenseCreateRequest request
    ) {
        ExpenseResponse response = expenseService.create(groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Expense saved.", response));
    }

    // FR-EXPENSE-02: 그룹 멤버는 그룹 지출 목록을 결제일 최신순으로 조회할 수 있다.
    @RequiredGroupMember
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> findGroupExpenses(@PathVariable Long groupId) {
        List<ExpenseResponse> response = expenseService.findGroupExpenses(groupId);
        return ResponseEntity.ok(ApiResponse.success("Expenses found.", response));
    }

    // FR-EXPENSE-03: 지출 작성자 또는 그룹 Owner는 지출과 분담 결과를 수정할 수 있다.
    @RequiredGroupMember
    @PatchMapping("/{expenseId}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @PathVariable Long groupId,
            @PathVariable Long expenseId,
            @RequestBody @Valid ExpenseUpdateRequest request
    ) {
        ExpenseResponse response = expenseService.update(groupId, expenseId, request);
        return ResponseEntity.ok(ApiResponse.success("Expense updated.", response));
    }

    // FR-EXPENSE-03: 지출 작성자 또는 그룹 Owner는 지출을 soft delete 처리할 수 있다.
    @RequiredGroupMember
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long groupId,
            @PathVariable Long expenseId
    ) {
        expenseService.delete(groupId, expenseId);
        return ResponseEntity.ok(ApiResponse.success("Expense deleted."));
    }
}
