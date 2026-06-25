package com.enjoytrip.backend.global.crypto;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 민감 개인정보(계좌/송금 링크) 컬럼용 AES-256-GCM 암복호화.
 * DB에는 암호문(Base64)만 저장하고, 인가된 응답으로 내보낼 때만 복호화한다(DB 덤프 유출 대비).
 *
 * <p>키: app.encryption-key(Base64, 16/24/32바이트)가 있으면 사용하고, 없으면 jwt.secret을
 * SHA-256으로 파생해 32바이트 키로 쓴다(별도 키 미설정 시에도 동작). JPA AttributeConverter가
 * 빈 주입 없이도 쓸 수 있도록 정적 홀더로 노출한다.
 */
@Component
public class PayoutCipher {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private static PayoutCipher instance;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public PayoutCipher(
            @Value("${app.encryption-key:}") String configuredKey,
            @Value("${jwt.secret:}") String jwtSecret) {
        this.key = new SecretKeySpec(resolveKeyBytes(configuredKey, jwtSecret), "AES");
        instance = this; // 정적 접근용(컨버터에서 사용)
    }

    /** 평문 → "Base64(IV || ciphertext+tag)". null/blank는 그대로 둔다. */
    public static String enc(String plain) {
        return (plain == null) ? null : instance.encrypt(plain);
    }

    /** 위 형식 복호화. 형식이 아니면(레거시 평문 등) 원본을 그대로 반환해 데이터 손실을 막는다. */
    public static String dec(String stored) {
        return (stored == null) ? null : instance.decrypt(stored);
    }

    private String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("payout 암호화 실패", e);
        }
    }

    private String decrypt(String stored) {
        try {
            byte[] all = Base64.getDecoder().decode(stored);
            if (all.length <= IV_BYTES) {
                return stored; // 형식 아님 → 원본 반환
            }
            byte[] iv = new byte[IV_BYTES];
            byte[] ct = new byte[all.length - IV_BYTES];
            System.arraycopy(all, 0, iv, 0, IV_BYTES);
            System.arraycopy(all, IV_BYTES, ct, 0, ct.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 복호화 불가(키 변경/평문 등) → 원본을 그대로 돌려준다(앱이 죽지 않도록).
            return stored;
        }
    }

    private static byte[] resolveKeyBytes(String configuredKey, String jwtSecret) {
        if (configuredKey != null && !configuredKey.isBlank()) {
            try {
                byte[] decoded = Base64.getDecoder().decode(configuredKey.trim());
                if (decoded.length == 16 || decoded.length == 24 || decoded.length == 32) {
                    return decoded;
                }
            } catch (IllegalArgumentException ignored) {
                // base64가 아니면 아래에서 해시 파생으로 처리
            }
        }
        // app.encryption-key 미설정/부적합 → jwt.secret을 SHA-256으로 32바이트 키 파생.
        try {
            String seed = (configuredKey != null && !configuredKey.isBlank()) ? configuredKey : jwtSecret;
            return MessageDigest.getInstance("SHA-256").digest(seed.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("암호화 키 파생 실패", e);
        }
    }
}
