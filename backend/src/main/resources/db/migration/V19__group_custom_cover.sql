-- 그룹 커스텀 커버 이미지 (Part A, 홀수 버전 V19).
-- coverImageKey = 'CUSTOM'이면 아래 cover_image를 커버로 사용한다(그 외엔 프리셋 그라데이션).
ALTER TABLE groups ADD COLUMN cover_image BYTEA;
ALTER TABLE groups ADD COLUMN cover_image_content_type VARCHAR(100);
