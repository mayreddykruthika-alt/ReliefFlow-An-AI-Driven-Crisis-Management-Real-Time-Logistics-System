



-- Clean rebuild of all tables
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

-- 2. Incidents Table (FLOAT8[] Array for Vector Embeddings)
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

-- 4. Dispatches Table (Transaction Mapping)
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

-- 6. Audit Logs Table (Automated Compliance Trail)
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
-- PRE-SEEDING INITIAL DATA
-- ---------------------------------------------------------

-- Seed First Aid Guidance Data
INSERT INTO first_aid_knowledge (condition_name, keywords, steps, do_not) VALUES
('Severe Bleeding', 'bleeding cut blood wound gash slice hemorrhage', 
 '1. Apply firm, direct pressure on the wound using a clean cloth or bandage. 2. Keep pressure applied continuously. 3. Elevate the injured area above heart level if possible. 4. Keep the victim calm and warm.', 
 'Do NOT remove the cloth if soaked; add more layers on top. Do NOT remove embedded foreign objects.'),

('Burns and Scalds', 'burn fire heat steam hot water scald skin blister', 
 '1. Cool the burn immediately under cold running water for 10 to 20 minutes. 2. Remove clothing/jewelry near the burned area gently unless stuck. 3. Cover loosely with a clean, dry, non-fluffy cloth or plastic wrap.', 
 'Do NOT apply ice, butter, grease, or ointments. Do NOT pop blisters.'),

('Fractures and Bone Injury', 'bone fracture broken leg arm fall joint sprain twist', 
 '1. Immobilize the injured area completely. 2. Support the limb using makeshift padding or cushions. 3. Apply a cold pack wrapped in cloth to reduce swelling.', 
 'Do NOT try to realign or straighten broken bones. Do NOT move the victim if a spine injury is suspected.'),

('Choking and Airway Obstruction', 'choking suffocation throat food air cough breathing', 
 '1. Encourage the person to cough forcefully. 2. Give up to 5 sharp back blows between shoulder blades with the heel of your hand. 3. Perform abdominal thrusts (Heimlich maneuver) if airway remains blocked.', 
 'Do NOT slap the person on the back while they are standing upright without leaning forward.'),

('Heat Stroke / Dehydration', 'heat stroke sun faint dizzy dehydration hot collapse', 
 '1. Move the victim to a cool, shaded area immediately. 2. Loosen tight clothing and fan the person. 3. Apply cool, wet towels to the neck, armpits, and groin. 4. Give small sips of water if conscious.', 
 'Do NOT give cold drinks too quickly. Do NOT leave the person unattended.');

-- Seed 5 Dispatchable Resources (IDs 1 through 5)
INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('Hyderabad NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
('Secunderabad Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
('Osmania Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
('Cyberabad Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
('Begumpet Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6);

TRUNCATE TABLE dispatches, incidents, resources, audit_logs CASCADE;

-- Reset Auto-Increment Sequences
ALTER SEQUENCE resources_resource_id_seq RESTART WITH 1;
ALTER SEQUENCE incidents_incident_id_seq RESTART WITH 1;
ALTER SEQUENCE dispatches_dispatch_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_log_id_seq RESTART WITH 1;

-- Pre-insert Resources (IDs 1 to 5)
INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('Hyderabad NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
('Secunderabad Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
('Osmania Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
('Cyberabad Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
('Begumpet Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6);

-- Pre-insert Incidents (IDs 1 to 3)
INSERT INTO incidents (description, location, severity, status) VALUES
('Water entering houses near river bank, need emergency boat evacuation.', POINT(78.4500, 17.3800), 'Critical', 'Pending'),
('Building collapsed after heavy rainfall, several victims trapped.', POINT(78.5100, 17.4200), 'High', 'Pending'),
('Gas leak reported near market area, multiple citizens fainting.', POINT(78.4800, 17.3900), 'Medium', 'Pending');

--Clear Dispatches & Reset Resource Locks:

TRUNCATE TABLE dispatches CASCADE;
UPDATE resources SET status = 'Available';
UPDATE incidents SET status = 'Pending';

--Clear Audit Logs (Development Maintenance Only):

TRUNCATE TABLE audit_logs RESTART IDENTITY;


-- Disable the trigger temporarily so allocation works without plpgsql.dll
DROP TRIGGER IF EXISTS resource_audit_trigger ON resources;


SELECT * FROM resources;
SELECT * FROM incidents;