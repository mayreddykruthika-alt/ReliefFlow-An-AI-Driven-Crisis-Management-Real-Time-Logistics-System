-- Check 1: Verify pgvector extension is active
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Check 2: Verify all 4 tables exist in database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('incidents', 'resources', 'dispatches', 'audit_logs');

-- Check 3: Verify HNSW index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'incidents' AND indexname = 'idx_incidents_embedding';

-- Check 4: Verify PL/pgSQL Trigger exists on resources table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'resources';