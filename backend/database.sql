-- Clean Rebuild of Database Schema
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS dispatches CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS first_aid_knowledge CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (Role-Based Access Control)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('DISPATCHER', 'ADMIN', 'VICTIM')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Incidents Table (FLOAT8[] Vector Storage)
CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    embedding FLOAT8[],
    location POINT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resources Table (Dispatchable Units)
CREATE TABLE resources (
    resource_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    location POINT NOT NULL,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Allocated', 'Maintenance')),
    capacity INT DEFAULT 1
);

-- 4. Dispatches Table (Pessimistic Locking Allocation Engine)
CREATE TABLE dispatches (
    dispatch_id SERIAL PRIMARY KEY,
    incident_id INT REFERENCES incidents(incident_id) ON DELETE CASCADE,
    resource_id INT REFERENCES resources(resource_id) ON DELETE CASCADE,
    dispatch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);

-- 5. First Aid Knowledge Base Table (RAG Chatbot)
CREATE TABLE first_aid_knowledge (
    id SERIAL PRIMARY KEY,
    condition_name VARCHAR(100) NOT NULL,
    keywords TEXT NOT NULL,
    steps TEXT NOT NULL,
    do_not TEXT NOT NULL
);

-- 6. Audit Logs Table (Automated PL/pgSQL Compliance Trail)
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

-- Attach Trigger to Resources Table
CREATE TRIGGER trg_audit_resource_update
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION log_resource_state_change();

-- ---------------------------------------------------------
-- PRE-SEEDED RECORDS FOR IMMEDIATE SYSTEM OPERATION
-- ---------------------------------------------------------

-- 1. Default Pre-Hashed Accounts (Password for all is 'dispatch123')
INSERT INTO users (username, hashed_password, role) VALUES 
('dispatcher', '$2b$12$eImiTXuWVxfM37uY4JANjO3m/N.9S8U3Yd4K/hFj4C8aR6O4q2Eee', 'DISPATCHER'),
('admin', '$2b$12$eImiTXuWVxfM37uY4JANjO3m/N.9S8U3Yd4K/hFj4C8aR6O4q2Eee', 'ADMIN');

-- 2. Dispatchable Emergency Resources (IDs 1 through 5)
INSERT INTO resources (resource_id, name, resource_type, location, status, capacity) VALUES
(1, 'Hyderabad NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
(2, 'Secunderabad Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
(3, 'Osmania Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
(4, 'Cyberabad Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
(5, 'Begumpet Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6);

-- 3. Initial Incidents (IDs 1 to 3)
INSERT INTO incidents (incident_id, description, location, severity, status) VALUES
(1, 'Water entering houses near river bank, need emergency boat evacuation immediately.', POINT(78.4500, 17.3800), 'Critical', 'Pending'),
(2, 'Building collapsed after heavy rainfall, several victims trapped under debris.', POINT(78.5100, 17.4200), 'High', 'Pending'),
(3, 'Gas leak reported near market area, multiple citizens suffocating.', POINT(78.4800, 17.3900), 'Medium', 'Pending');

-- Set sequence counters to continue cleanly
SELECT setval('resources_resource_id_seq', 5);
SELECT setval('incidents_incident_id_seq', 3);

-- 4. First Aid Guidance Database
INSERT INTO first_aid_knowledge (condition_name, keywords, steps, do_not) VALUES
('Severe Bleeding', 'bleeding cut blood wound gash slice hemorrhage', 
 '1. Apply firm, direct pressure with a clean cloth. 2. Elevate injured area above heart level. 3. Keep victim calm.', 
 'Do NOT remove soaked cloth; add more layers on top. Do NOT remove embedded foreign objects.'),
('Burns and Scalds', 'burn fire heat steam hot water scald skin blister', 
 '1. Cool burn under cold running water for 10-20 mins. 2. Cover loosely with clean plastic wrap or dry cloth.', 
 'Do NOT apply ice, butter, grease, or ointments. Do NOT pop blisters.'),
('Fractures and Bone Injury', 'bone fracture broken leg arm fall joint sprain twist', 
 '1. Immobilize the injured area completely. 2. Support limb using makeshift padding. 3. Apply cold pack.', 
 'Do NOT try to realign broken bones. Do NOT move victim if spine injury is suspected.'),
('Choking and Airway Obstruction', 'choking suffocation throat food air cough breathing', 
 '1. Encourage person to cough forcefully. 2. Give up to 5 sharp back blows. 3. Perform abdominal thrusts.', 
 'Do NOT slap person on the back while standing upright without leaning forward.');