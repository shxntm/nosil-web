-- daily_completed 테이블에 uid + task_id unique constraint 추가
ALTER TABLE daily_completed ADD CONSTRAINT daily_completed_uid_task_id_key UNIQUE (uid, task_id);
