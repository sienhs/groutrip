package com.enjoytrip.backend.domain.board.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.board.dto.CommentCreateRequest;
import com.enjoytrip.backend.domain.board.dto.CommentResponse;
import com.enjoytrip.backend.domain.board.dto.PostCreateRequest;
import com.enjoytrip.backend.domain.board.dto.PostResponse;
import com.enjoytrip.backend.domain.board.service.PostService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostResponse>>> listPosts(@PathVariable Long groupId) {
        return ResponseEntity.ok(ApiResponse.success("OK", postService.listPosts(groupId)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> getPost(
            @PathVariable Long groupId,
            @PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success("OK", postService.getPost(groupId, postId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @PathVariable Long groupId,
            @RequestBody @Valid PostCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("CREATED", postService.createPost(groupId, request)));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @RequestBody @Valid PostCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("OK", postService.updatePost(groupId, postId, request)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long groupId,
            @PathVariable Long postId) {
        postService.deletePost(groupId, postId);
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @RequestBody @Valid CommentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("CREATED", postService.addComment(groupId, postId, request)));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @PathVariable Long commentId) {
        postService.deleteComment(groupId, postId, commentId);
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }
}
