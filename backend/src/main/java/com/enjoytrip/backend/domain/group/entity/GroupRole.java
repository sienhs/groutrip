package com.enjoytrip.backend.domain.group.entity;

// 그룹 안에서 사용자의 권한을 구분한다. Owner만 그룹 관리 기능을 실행할 수 있다.
public enum GroupRole {
    OWNER,
    MEMBER
}
