-- 重复前缀索引实验：复现错误计划和 ERROR 1038
-- 两个 SET 都只作用于当前连接。

SET SESSION optimizer_switch = 'prefer_ordering_index=off';

EXPLAIN
SELECT id, body, detail
FROM note
WHERE thread_id = 'thread-long'
  AND tenant_id = 1001
ORDER BY id DESC
LIMIT 10\G

-- 期望：
--   key: uk_note_tenant_thread_key
--   key_len: 1032
--   Extra: Using filesort

SET SESSION sort_buffer_size = 32768;

SELECT id, body, detail
FROM note
WHERE thread_id = 'thread-long'
  AND tenant_id = 1001
ORDER BY id DESC
LIMIT 10;

-- 期望：
--   ERROR 1038 (HY001): Out of sort memory, consider increasing server sort buffer size
