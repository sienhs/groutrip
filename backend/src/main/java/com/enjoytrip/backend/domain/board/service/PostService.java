package com.enjoytrip.backend.domain.board.service;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.board.dto.CommentCreateRequest;
import com.enjoytrip.backend.domain.board.dto.CommentResponse;
import com.enjoytrip.backend.domain.board.dto.PostCreateRequest;
import com.enjoytrip.backend.domain.board.dto.PostResponse;
import com.enjoytrip.backend.domain.board.entity.Comment;
import com.enjoytrip.backend.domain.board.entity.Post;
import com.enjoytrip.backend.domain.board.repository.CommentRepository;
import com.enjoytrip.backend.domain.board.repository.PostRepository;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.event.DomainEvent;
import com.enjoytrip.backend.global.event.EventType;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<PostResponse> listPosts(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        return postRepository.findByGroupIdOrderByCreatedAtDesc(groupId)
                .stream().map(PostResponse::summary).toList();
    }

    @Transactional(readOnly = true)
    public PostResponse getPost(Long groupId, Long postId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Post post = findPost(groupId, postId);
        List<CommentResponse> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(CommentResponse::from).toList();
        return PostResponse.from(post, comments);
    }

    public PostResponse createPost(Long groupId, PostCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        Post post = postRepository.save(Post.builder()
                .group(group)
                .author(user)
                .title(request.title())
                .content(request.content())
                .build());

        eventPublisher.publishEvent(DomainEvent.of(EventType.POST_CREATED, groupId, user.getId(), post.getId()));

        return PostResponse.from(post, List.of());
    }

    public PostResponse updatePost(Long groupId, Long postId, PostCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Post post = findPost(groupId, postId);
        if (!post.isOwnedBy(user.getId())) {
            throw new BusinessException(ErrorCode.POST_FORBIDDEN);
        }
        post.update(request.title(), request.content());
        List<CommentResponse> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(CommentResponse::from).toList();
        return PostResponse.from(post, comments);
    }

    public void deletePost(Long groupId, Long postId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Post post = findPost(groupId, postId);
        if (!post.isOwnedBy(user.getId())) {
            throw new BusinessException(ErrorCode.POST_FORBIDDEN);
        }
        postRepository.delete(post);
    }

    public CommentResponse addComment(Long groupId, Long postId, CommentCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Post post = findPost(groupId, postId);

        Comment comment = commentRepository.save(Comment.builder()
                .post(post)
                .author(user)
                .content(request.content())
                .build());
        post.incrementCommentCount();

        eventPublisher.publishEvent(DomainEvent.of(EventType.COMMENT_ADDED, groupId, user.getId(), postId));

        return CommentResponse.from(comment);
    }

    public void deleteComment(Long groupId, Long postId, Long commentId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        Post post = findPost(groupId, postId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
        if (!comment.isOwnedBy(user.getId())) {
            throw new BusinessException(ErrorCode.COMMENT_FORBIDDEN);
        }
        commentRepository.delete(comment);
        post.decrementCommentCount();
    }

    private Post findPost(Long groupId, Long postId) {
        return postRepository.findByIdAndGroupId(postId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
    }
}
