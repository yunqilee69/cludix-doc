-- 重复前缀索引实验：初始化
-- 目标库需要已经存在。脚本会删除并重建 note。
-- mysql -u<user> -p idx_lab < 01-init.sql

DROP TABLE IF EXISTS note;

CREATE TABLE note (
    id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    version INT NOT NULL DEFAULT 1,
    owner_id VARCHAR(255),
    thread_id VARCHAR(255),
    item_key VARCHAR(255),
    tenant_id BIGINT,
    body JSON,
    detail JSON,
    PRIMARY KEY (id),
    UNIQUE KEY uk_note_tenant_thread_key (tenant_id, thread_id, item_key(16)),
    KEY idx_note_tenant_thread_id (tenant_id, thread_id, id)
) ENGINE=InnoDB;

-- 一个很长的分组：800 条宽行。body、detail 各约 20KB。
INSERT INTO note (
    id, created_at, updated_at, owner_id, thread_id, item_key, tenant_id, body, detail
)
SELECT
    n,
    NOW(),
    NOW(),
    'owner',
    'thread-long',
    CONCAT('key-', n),
    1001,
    JSON_OBJECT('text', REPEAT('x', 20000)),
    JSON_OBJECT('nodes', REPEAT('z', 20000))
FROM (
    SELECT a.n + b.n * 10 + c.n * 100 + 1 AS n
    FROM
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c
) seq
WHERE n <= 800;

-- 4000 个只有一行的短分组，把“平均每个分组的行数”压低。
INSERT INTO note (
    id, created_at, updated_at, owner_id, thread_id, item_key, tenant_id, body, detail
)
SELECT
    100000 + n,
    NOW(),
    NOW(),
    'owner',
    CONCAT('thread-', n),
    CONCAT('k-', n),
    1001,
    JSON_OBJECT('t', 'a'),
    JSON_OBJECT('t', 'b')
FROM (
    SELECT a.n + b.n * 10 + c.n * 100 + d.n * 1000 + 1 AS n
    FROM
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) d
) seq
WHERE n <= 4000;

ANALYZE TABLE note;
