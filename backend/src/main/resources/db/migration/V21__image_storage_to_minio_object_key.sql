-- 이미지 저장을 DB bytea -> MinIO object key 로 전환한다.
-- 엔티티는 바이트 대신 object key(varchar)만 보관하고, 실제 바이트는 MinIO에서 조회한다.
-- (Part A는 홀수 마이그레이션 번호 사용. V19 다음 가용 홀수 = V21.)
-- 기존 dev 이미지 데이터는 초기화된다. content_type 컬럼은 그대로 유지한다.

-- 1) 사용자 프로필 사진: avatar(bytea) -> avatar_key(varchar)
ALTER TABLE users DROP COLUMN IF EXISTS avatar;
ALTER TABLE users ADD COLUMN avatar_key VARCHAR(255);

-- 2) 그룹 커스텀 커버: cover_image(bytea) -> cover_object_key(varchar)
--    (cover_image_key 프리셋 식별자 컬럼과 역할이 다르므로 별도 컬럼 사용)
ALTER TABLE groups DROP COLUMN IF EXISTS cover_image;
ALTER TABLE groups ADD COLUMN cover_object_key VARCHAR(255);

-- 3) 그룹 갤러리 사진: data(bytea) -> object_key(varchar NOT NULL)
ALTER TABLE group_photos DROP COLUMN IF EXISTS data;
ALTER TABLE group_photos ADD COLUMN object_key VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE group_photos ALTER COLUMN object_key DROP DEFAULT;

-- 4) 숙소 예약완료 사진: booking_photo(bytea) -> booking_photo_key(varchar)
ALTER TABLE group_accommodations DROP COLUMN IF EXISTS booking_photo;
ALTER TABLE group_accommodations ADD COLUMN booking_photo_key VARCHAR(255);
