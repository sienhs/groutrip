-- FR-EXPENSE: 정산 받을 송금 링크/계좌 정보. 보낸 사람이 정산 송금 시 받는 사람의 링크/계좌로 바로 연결한다.
-- 둘 다 선택값(null 허용). payout_link = 토스/카카오페이 송금 링크(URL), payout_account = 은행/계좌(자유 텍스트).
ALTER TABLE users ADD COLUMN payout_link VARCHAR(255);
ALTER TABLE users ADD COLUMN payout_account VARCHAR(120);
