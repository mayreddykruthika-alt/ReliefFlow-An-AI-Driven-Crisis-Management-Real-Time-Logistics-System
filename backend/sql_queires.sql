-- Clean rebuild
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS dispatches CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;

-- 1. Incidents Table (FLOAT8[] Array)
CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    embedding FLOAT8[],                         -- Native PostgreSQL Float Array
    location POINT NOT NULL,                    -- Native Point Geometry
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resources Table
CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    location POINT NOT NULL,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Allocated', 'Maintenance')),
    capacity INT DEFAULT 1
);

-- 3. Dispatches Table
CREATE TABLE dispatches (
    dispatch_id SERIAL PRIMARY KEY,
    incident_id INT REFERENCES incidents(incident_id) ON DELETE CASCADE,
    resource_id INT REFERENCES resources(resource_id) ON DELETE CASCADE,
    dispatch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 4. Audit Logs Table
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_state JSONB,
    new_state JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PL/pgSQL Trigger Function for Automated Auditing
CREATE OR REPLACE FUNCTION log_resource_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_logs (entity_name, record_id, action, old_state, new_state)
        VALUES (
            'resources',
            NEW.resource_id,
            'UPDATE',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_resource_update
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION log_resource_state_change();