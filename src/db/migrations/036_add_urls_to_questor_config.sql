-- Add internal_url and external_url to questor_syn_config
ALTER TABLE questor_syn_config ADD COLUMN internal_url TEXT;
ALTER TABLE questor_syn_config ADD COLUMN external_url TEXT;
