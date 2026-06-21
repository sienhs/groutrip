package com.enjoytrip.backend.domain.group.aop;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Aspect
@Component
@RequiredArgsConstructor
public class GroupPermissionAspect {

    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    // @RequiredGroupMember가 붙은 API는 현재 사용자가 해당 그룹의 활성 멤버인지 먼저 확인한다.
    @Before("@annotation(groupMember)")
    public void checkGroupMember(JoinPoint joinPoint, RequiredGroupMember groupMember) {
        User user = currentUserResolver.getCurrentUser();
        Long groupId = extractGroupId(joinPoint, groupMember.groupIdParam());
        groupAccessValidator.validateMember(groupId, user.getId());
    }

    // @RequiredGroupOwner가 붙은 API는 그룹 멤버 검증 후 Owner 역할인지 추가로 확인한다.
    @Before("@annotation(groupOwner)")
    public void checkGroupOwner(JoinPoint joinPoint, RequiredGroupOwner groupOwner) {
        User user = currentUserResolver.getCurrentUser();
        Long groupId = extractGroupId(joinPoint, groupOwner.groupIdParam());
        groupAccessValidator.validateOwner(groupId, user.getId());
    }

    // 컨트롤러 메서드의 파라미터 이름에서 groupId를 찾아 AOP 권한 검증에 사용한다.
    private Long extractGroupId(JoinPoint joinPoint, String groupIdParam) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] parameterNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameterNames.length; i++) {
            if (groupIdParam.equals(parameterNames[i]) && args[i] instanceof Long groupId) {
                return groupId;
            }
        }

        throw new BusinessException(ErrorCode.INVALID_INPUT);
    }
}
