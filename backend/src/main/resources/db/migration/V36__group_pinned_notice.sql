-- 채팅 허브 상단 고정 공지. 방장이 게시판 공지글(POST) 또는 진행중 투표(VOTE) 하나를 고정한다.
-- 제목은 고정 시점 값을 비정규화 저장해 표시용 추가 조회를 피한다.
ALTER TABLE groups ADD COLUMN pinned_type   VARCHAR(10);
ALTER TABLE groups ADD COLUMN pinned_ref_id BIGINT;
ALTER TABLE groups ADD COLUMN pinned_title  VARCHAR(200);
