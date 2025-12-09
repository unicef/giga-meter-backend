DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connectivity_ping_checks' 
        AND column_name = 'latency'
    ) THEN
        ALTER TABLE "connectivity_ping_checks" ADD COLUMN "latency" DOUBLE PRECISION;
    END IF;
END $$;