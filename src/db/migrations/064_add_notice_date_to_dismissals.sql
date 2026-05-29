ALTER TABLE dismissals
ADD COLUMN IF NOT EXISTS notice_date TEXT;

UPDATE dismissals
SET notice_date = dismissal_date
WHERE notice_date IS NULL
  AND COALESCE(notice_type, '') <> 'Trabalhado';
