-- Drop redundant non-unique index on DailyHealthMetric.date
-- The @unique constraint already creates a btree index suitable for point lookups and range scans.
DROP INDEX IF EXISTS "DailyHealthMetric_date_idx";


