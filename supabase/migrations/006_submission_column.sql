-- Store the learner's last submission alongside the score
ALTER TABLE progress ADD COLUMN IF NOT EXISTS submission JSONB;
