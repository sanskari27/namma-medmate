UPDATE user_session
SET revoked_at = NOW()
WHERE revoked_at IS NULL
  AND id NOT IN (
    SELECT keep_id
    FROM (
      SELECT DISTINCT ON (user_id) id AS keep_id
      FROM user_session
      WHERE revoked_at IS NULL
      ORDER BY user_id, created_at DESC
    ) keepers
  );

DROP INDEX IF EXISTS idx_user_session_user_active;

CREATE UNIQUE INDEX uq_user_session_one_active
    ON user_session (user_id)
    WHERE revoked_at IS NULL;
