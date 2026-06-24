-- 한 숙소가 여러 박(체크인~체크아웃)을 커버할 수 있도록 마지막 숙박일(stay_end_date)을 추가한다.
-- 기존 행은 stay_date와 동일 의미(1박)로 두기 위해 null 허용. 조회 시 stay_end_date ?? stay_date로 처리한다.
ALTER TABLE group_accommodations ADD COLUMN stay_end_date DATE;
