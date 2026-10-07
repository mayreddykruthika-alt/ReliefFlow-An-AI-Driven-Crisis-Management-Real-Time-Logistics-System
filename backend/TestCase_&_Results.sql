




-- TC-DBMS-01: Verify Ingested Incidents & Coordinates

SELECT incident_id, description, severity, status, location 
FROM incidents 
LIMIT 5;

-- TC-DBMS-02: Row-Level Concurrency Lock (SELECT ... FOR UPDATE):

BEGIN;
-- Locks resource #1 to block simultaneous dispatch double-booking
SELECT resource_id, name, status 
FROM resources 
WHERE resource_id = 1 
FOR UPDATE;
-- Execute dispatch assignment
INSERT INTO dispatches (incident_id, resource_id) VALUES (1, 1);
-- Update responder status
UPDATE resources SET status = 'Allocated' WHERE resource_id = 1;
COMMIT;

--TC-DBMS-03: Atomic Transaction Rollback

BEGIN;
INSERT INTO dispatches (incident_id, resource_id) VALUES (2, 2);
-- Simulating error rollback
ROLLBACK;
-- Verify no orphaned dispatches exist
SELECT * FROM dispatches WHERE incident_id = 2;

-- TC-DBMS-04: Verify Automated Trigger Audit Log

SELECT log_id, entity_name, record_id, action, old_state, new_state, changed_at 
FROM audit_logs 
ORDER BY changed_at DESC;