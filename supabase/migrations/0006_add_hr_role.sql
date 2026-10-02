-- ============================================================================
-- Wyndell's — the HR role
-- Adds `hr` to the platform role enum.
--
-- Kept in its own migration (apart from 0007, which stores rows using the new
-- value) because PostgreSQL refuses to *use* a value added to an enum inside
-- the same transaction that added it.
-- ============================================================================

alter type user_role add value if not exists 'hr';
