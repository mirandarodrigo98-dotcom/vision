ALTER TABLE transfer_requests ADD COLUMN target_company_id TEXT;
-- We can optionally copy target_company_name to target_company_id if we had data, 
-- but we don't expect valid ids in target_company_name which was free text.
-- Since this is a new feature, existing data (if any) will have null target_company_id.
