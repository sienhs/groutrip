package com.enjoytrip.backend.domain.group.aop;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.test.util.ReflectionTestUtils;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

class GroupPermissionAspectTest {

    private GroupAccessValidator groupAccessValidator;
    private PermissionTarget proxy;

    @BeforeEach
    void setUp() {
        CurrentUserResolver currentUserResolver = mock(CurrentUserResolver.class);
        groupAccessValidator = mock(GroupAccessValidator.class);

        User user = User.builder()
                .email("member@test.com")
                .password("encoded")
                .name("멤버")
                .build();
        ReflectionTestUtils.setField(user, "id", 7L);
        when(currentUserResolver.getCurrentUser()).thenReturn(user);

        GroupPermissionAspect aspect = new GroupPermissionAspect(currentUserResolver, groupAccessValidator);
        AspectJProxyFactory factory = new AspectJProxyFactory(new PermissionTarget());
        factory.addAspect(aspect);
        proxy = factory.getProxy();
    }

    @Test
    void requiredGroupMemberValidatesCurrentUserAndGroupId() {
        assertDoesNotThrow(() -> proxy.memberOnly(15L));

        verify(groupAccessValidator).validateMember(15L, 7L);
    }

    @Test
    void requiredGroupOwnerValidatesCurrentUserAndCustomGroupIdParameter() {
        assertDoesNotThrow(() -> proxy.ownerOnly(21L));

        verify(groupAccessValidator).validateOwner(21L, 7L);
    }

    @Test
    void missingConfiguredGroupIdParameterIsRejected() {
        BusinessException exception = assertThrows(BusinessException.class, () -> proxy.invalid(30L));

        assertEquals(ErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    static class PermissionTarget {

        @RequiredGroupMember
        void memberOnly(Long groupId) {
        }

        @RequiredGroupOwner(groupIdParam = "travelGroupId")
        void ownerOnly(Long travelGroupId) {
        }

        @RequiredGroupMember(groupIdParam = "missingGroupId")
        void invalid(Long groupId) {
        }
    }
}
