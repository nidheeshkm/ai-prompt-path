-- Migration 016: Drop redundant certificate_id column
--
-- certificates.id (uuid, gen_random_uuid(), PK) already provides an
-- unguessable identifier. The separate certificate_id text column was
-- app-generated (crypto.randomUUID()) and is redundant.
-- URLs and lookups now use id directly.

ALTER TABLE certificates DROP COLUMN IF EXISTS certificate_id;
