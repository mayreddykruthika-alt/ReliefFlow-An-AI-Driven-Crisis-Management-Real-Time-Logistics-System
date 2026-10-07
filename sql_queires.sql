

TRUNCATE TABLE dispatches, resources CASCADE;

ALTER SEQUENCE resources_resource_id_seq RESTART WITH 1;

INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
('Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
('Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
('Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
('Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6),
('Response Engine 2', 'Fire Engine', POINT(78.4747, 17.3616), 'Available', 4),
('Trauma Rapid Express 2', 'Ambulance', POINT(78.3489, 17.4401), 'Available', 2),
('Military Relief Unit 2', 'Helicopter', POINT(78.5241, 17.5528), 'Available', 6),
('Rations Logistics Truck 1', 'Supply Truck', POINT(78.5483, 17.3503), 'Available', 10),
('Rapid Relief Supply Truck 2', 'Supply Truck', POINT(78.3481, 17.4962), 'Available', 10);



select * from resources

SELECT incident_id, description, status FROM incidents ORDER BY incident_id ASC;

TRUNCATE TABLE dispatches, incidents, resources CASCADE;


-- Reset Sequence Counters to 1
ALTER SEQUENCE resources_resource_id_seq RESTART WITH 1;
ALTER SEQUENCE incidents_incident_id_seq RESTART WITH 1;

-- Pre-seed Resources (IDs 1 through 5)
INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
('Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
('Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
('Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
('Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6);

-- Pre-seed Incidents (IDs 1 through 3)
INSERT INTO incidents (description, location, severity, status) VALUES
('Water entering houses near river bank, need emergency boat evacuation immediately.', POINT(78.4500, 17.3800), 'Critical', 'Pending'),
('Building collapsed after heavy rainfall, several victims trapped under debris.', POINT(78.5100, 17.4200), 'High', 'Pending'),
('Gas leak reported near market area, multiple citizens suffocating.', POINT(78.4800, 17.3900), 'Medium', 'Pending');

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


-- Create First Aid Knowledge Base Table
CREATE TABLE IF NOT EXISTS first_aid_knowledge (
    id SERIAL PRIMARY KEY,
    condition_name VARCHAR(100) NOT NULL,
    keywords TEXT NOT NULL,
    steps TEXT NOT NULL,
    do_not TEXT NOT NULL
);


-- Seed Verified First Aid Guidance Data
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

select * from incidents

TRUNCATE TABLE dispatches, incidents, resources, audit_logs CASCADE;

ALTER SEQUENCE resources_resource_id_seq RESTART WITH 1;
ALTER SEQUENCE incidents_incident_id_seq RESTART WITH 1;
ALTER SEQUENCE dispatches_dispatch_id_seq RESTART WITH 1;

-- Pre-seed 5 Resources (IDs 1 through 5)
INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('NDRF Rescue Unit 1', 'Rescue Boat', POINT(78.4867, 17.3850), 'Available', 5),
('Central Fire Station', 'Fire Engine', POINT(78.5011, 17.4399), 'Available', 3),
('Emergency Response', 'Ambulance', POINT(78.4744, 17.3713), 'Available', 2),
('Flood Relief Team', 'Rescue Boat', POINT(78.3808, 17.4483), 'Available', 4),
('Aerial Rescue Service', 'Helicopter', POINT(78.4739, 17.4448), 'Available', 6);

-- Pre-seed 5 more Resources 
INSERT INTO resources (name, resource_type, location, status, capacity) VALUES
('Response Engine 2', 'Fire Engine', POINT(78.4747, 17.3616), 'Available', 4),
('Trauma Rapid Express 2', 'Ambulance', POINT(78.3489, 17.4401), 'Available', 2),
('Military Relief Unit 2', 'Helicopter', POINT(78.5241, 17.5528), 'Available', 6),
('Rations Logistics Truck 1', 'Supply Truck', POINT(78.5483, 17.3503), 'Available', 10),
('Rapid Relief Supply Truck 2', 'Supply Truck', POINT(78.3481, 17.4962), 'Available', 10);

-- Pre-seed 3 Incidents (IDs 1 through 3)
INSERT INTO incidents (description, location, severity, status) VALUES
('Water entering houses near river bank, need emergency boat evacuation immediately.', POINT(78.4500, 17.3800), 'Critical', 'Pending'),
('Building collapsed after heavy rainfall, several victims trapped under debris.', POINT(78.5100, 17.4200), 'High', 'Pending'),
('Gas leak reported near market area, multiple citizens suffocating.', POINT(78.4800, 17.3900), 'Medium', 'Pending');



 select * from users