package com.enjoytrip.backend.domain.group.aop;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiredGroupOwner {

    // 컨트롤러 메서드 파라미터 중 그룹 id에 해당하는 이름을 지정한다.
    String groupIdParam() default "groupId";
}
