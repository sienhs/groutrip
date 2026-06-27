CREATE TABLE chat_messages (
    id         BIGSERIAL PRIMARY KEY,
    group_id   BIGINT        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id  BIGINT        NOT NULL REFERENCES users(id),
    content    VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_group_id ON chat_messages(group_id, id DESC);

CREATE TABLE posts (
    id            BIGSERIAL PRIMARY KEY,
    group_id      BIGINT       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id     BIGINT       NOT NULL REFERENCES users(id),
    title         VARCHAR(200) NOT NULL,
    content       TEXT         NOT NULL,
    comment_count INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_group_id ON posts(group_id, created_at DESC);

CREATE TABLE comments (
    id         BIGSERIAL    PRIMARY KEY,
    post_id    BIGINT       NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  BIGINT       NOT NULL REFERENCES users(id),
    content    VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id ON comments(post_id, created_at ASC);
