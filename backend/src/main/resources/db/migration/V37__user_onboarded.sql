-- 온보딩(개인정보 동의 등) 완료 여부를 계정 단위로 보관한다.
-- 기존 사용자는 이미 앱을 쓰고 있으므로 true로 채워 재노출을 막는다.
ALTER TABLE users ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET onboarded = true;
