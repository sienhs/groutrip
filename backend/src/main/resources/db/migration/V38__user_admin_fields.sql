-- 관리자(운영자) 제재 기능용 계정 필드.
-- banned: 정지된 계정은 로그인/인증이 차단된다. 기존 사용자는 정상(false)으로 채운다.
-- badge : 관리자가 이름 옆에 붙이는 장난 배지/칭호(없으면 null).
ALTER TABLE users ADD COLUMN banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN badge VARCHAR(30);
