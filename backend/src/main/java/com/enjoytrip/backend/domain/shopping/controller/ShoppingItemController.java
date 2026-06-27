package com.enjoytrip.backend.domain.shopping.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.shopping.dto.ShoppingItemCreateRequest;
import com.enjoytrip.backend.domain.shopping.dto.ShoppingItemResponse;
import com.enjoytrip.backend.domain.shopping.service.ShoppingItemService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/shopping-items")
@RequiredArgsConstructor
public class ShoppingItemController {

    private final ShoppingItemService shoppingItemService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShoppingItemResponse>>> listItems(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("OK", shoppingItemService.listItems(groupId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShoppingItemResponse>> addItem(
            @PathVariable Long groupId,
            @RequestBody @Valid ShoppingItemCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("CREATED", shoppingItemService.addItem(groupId, request)));
    }

    @PatchMapping("/{itemId}/check")
    public ResponseEntity<ApiResponse<ShoppingItemResponse>> toggleCheck(
            @PathVariable Long groupId,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.success("OK", shoppingItemService.toggleCheck(groupId, itemId)));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable Long groupId,
            @PathVariable Long itemId) {
        shoppingItemService.deleteItem(groupId, itemId);
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }
}
