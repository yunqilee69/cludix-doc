-- 重复前缀索引实验：调整唯一索引列顺序
-- 唯一约束仍是 (tenant_id, thread_id, item_key) 这一组值。

ALTER TABLE note
    DROP INDEX uk_note_tenant_thread_key,
    ADD UNIQUE INDEX uk_note_tenant_thread_key (item_key, tenant_id, thread_id);

ANALYZE TABLE note;

SET SESSION optimizer_switch = DEFAULT;

EXPLAIN
SELECT id, body, detail
FROM note
WHERE thread_id = 'thread-long'
  AND tenant_id = 1001
ORDER BY id DESC
LIMIT 10\G

-- 期望：
--   key: idx_note_tenant_thread_id
--   Extra: Backward index scan
--   不再出现 Using filesort

SELECT id
FROM note
WHERE thread_id = 'thread-long'
  AND tenant_id = 1001
ORDER BY id DESC
LIMIT 10;

EXPLAIN
SELECT id
FROM note
WHERE tenant_id = 1001
  AND thread_id = 'thread-long'
  AND item_key = 'key-10'\G

-- 期望：
--   type: const
--   key: uk_note_tenant_thread_key
