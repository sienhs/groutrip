-- FR-EXPENSE-01: 지출 항목(description)과 별개의 자유 메모 컬럼 추가 (Part A, 홀수 버전 V15).
ALTER TABLE expenses ADD COLUMN memo VARCHAR(255);
