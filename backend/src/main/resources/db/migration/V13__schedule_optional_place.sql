-- 빈 일정 지원 (Part A, 홀수 버전 V13).
-- 장소가 아직 정해지지 않은(투표로 정할) 일정을 허용하기 위해 place_id를 NULL 허용으로 바꾸고,
-- 사용자가 직접 입력하는 일정 제목(title) 컬럼을 추가한다.

ALTER TABLE schedules ALTER COLUMN place_id DROP NOT NULL;
ALTER TABLE schedules ADD COLUMN title VARCHAR(100);
