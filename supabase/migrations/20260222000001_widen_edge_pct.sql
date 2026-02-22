-- Widen edge_pct from DECIMAL(5,3) to DECIMAL(7,3) to handle edges > 100%
ALTER TABLE edge_scans ALTER COLUMN edge_pct TYPE DECIMAL(7,3);
