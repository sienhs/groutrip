-- 채팅 읽음 표시(카카오톡식 "N명 안 읽음") — 멤버별 그룹 채팅 최종 읽은 메시지 위치.
CREATE TABLE chat_reads (
    id                   BIGSERIAL PRIMARY KEY,
    group_id             BIGINT    NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id              BIGINT    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    last_read_message_id BIGINT    NOT NULL DEFAULT 0,
    updated_at           TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_reads_group_user UNIQUE (group_id, user_id)
);

CREATE INDEX idx_chat_reads_group ON chat_reads(group_id);
