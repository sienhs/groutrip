package com.enjoytrip.backend.domain.group.support;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

@Component
public class InviteCodeGenerator {

    // 혼동하기 쉬운 I, O, 0, 1을 제외해 사용자가 초대코드를 입력할 때 실수를 줄인다.
    private static final char[] CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    // FR-GROUP-01/07: 그룹 생성과 초대코드 재발급에 사용할 6자리 코드를 만든다.
    public String generate() {
        char[] code = new char[CODE_LENGTH];
        for (int i = 0; i < CODE_LENGTH; i++) {
            code[i] = CHARS[random.nextInt(CHARS.length)];
        }
        return new String(code);
    }
}
