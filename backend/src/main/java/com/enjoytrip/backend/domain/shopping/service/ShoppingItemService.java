package com.enjoytrip.backend.domain.shopping.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.domain.group.repository.TravelGroupRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.shopping.dto.ShoppingItemCreateRequest;
import com.enjoytrip.backend.domain.shopping.dto.ShoppingItemResponse;
import com.enjoytrip.backend.domain.shopping.entity.ShoppingItem;
import com.enjoytrip.backend.domain.shopping.repository.ShoppingItemRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ShoppingItemService {

    private final ShoppingItemRepository shoppingItemRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    @Transactional(readOnly = true)
    public List<ShoppingItemResponse> listItems(Long groupId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        return shoppingItemRepository.findByGroupIdOrderByCreatedAtAsc(groupId)
                .stream().map(ShoppingItemResponse::from).toList();
    }

    public ShoppingItemResponse addItem(Long groupId, ShoppingItemCreateRequest request) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        TravelGroup group = travelGroupRepository.findByIdAndDeletedAtIsNull(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        ShoppingItem item = shoppingItemRepository.save(ShoppingItem.builder()
                .group(group)
                .addedBy(user)
                .name(request.name())
                .quantity(request.quantity())
                .build());

        return ShoppingItemResponse.from(item);
    }

    public ShoppingItemResponse toggleCheck(Long groupId, Long itemId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        ShoppingItem item = findItem(groupId, itemId);
        item.toggleChecked();
        return ShoppingItemResponse.from(item);
    }

    public void deleteItem(Long groupId, Long itemId) {
        User user = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, user.getId());
        ShoppingItem item = findItem(groupId, itemId);
        if (!item.isOwnedBy(user.getId())) {
            throw new BusinessException(ErrorCode.SHOPPING_ITEM_FORBIDDEN);
        }
        shoppingItemRepository.delete(item);
    }

    private ShoppingItem findItem(Long groupId, Long itemId) {
        return shoppingItemRepository.findByIdAndGroupId(itemId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SHOPPING_ITEM_NOT_FOUND));
    }
}
