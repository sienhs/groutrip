package com.enjoytrip.backend.global.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * 민감 개인정보 컬럼용 JPA 컨버터. 엔티티 필드에 @Convert로 붙이면 저장 시 암호화, 조회 시 복호화된다.
 * 실제 암복호화는 {@link PayoutCipher}(AES-256-GCM)에 위임한다.
 */
@Converter
public class PayoutCryptoConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return PayoutCipher.enc(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return PayoutCipher.dec(dbData);
    }
}
