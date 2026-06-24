-- 숙소를 날짜별로 선택할 수 있도록 숙박일(stay_date)을 추가한다.
-- 기존 행은 null(날짜 미지정)로 두어 하위 호환을 유지한다.
ALTER TABLE group_accommodations ADD COLUMN stay_date DATE;

CREATE INDEX idx_group_acc_group_date ON group_accommodations (group_id, stay_date);
