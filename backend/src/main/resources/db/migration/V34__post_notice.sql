ALTER TABLE posts ADD COLUMN is_notice BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_posts_group_notice ON posts(group_id, is_notice);
