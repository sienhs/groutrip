-- 정산 링크/계좌를 AES-GCM 암호문(Base64)으로 저장하면 평문보다 길어지므로 컬럼을 넉넉히 넓힌다.
-- (기능 추가 직후라 기존 데이터는 없거나 평문 → 복호화 시 PayoutCipher가 원본을 그대로 반환해 안전).
ALTER TABLE users ALTER COLUMN payout_link TYPE VARCHAR(512);
ALTER TABLE users ALTER COLUMN payout_account TYPE VARCHAR(512);
