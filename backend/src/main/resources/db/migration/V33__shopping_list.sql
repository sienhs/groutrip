CREATE TABLE shopping_items (
    id         BIGSERIAL    PRIMARY KEY,
    group_id   BIGINT       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    added_by   BIGINT       NOT NULL REFERENCES users(id),
    name       VARCHAR(100) NOT NULL,
    quantity   VARCHAR(50),
    is_checked BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_items_group_id ON shopping_items(group_id, created_at ASC);
