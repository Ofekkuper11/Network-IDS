-- =========================================
-- IDS CLEAN DATABASE SCHEMA
-- Only what is actually used in the project
-- =========================================

-- =========================================
-- ALERTS TABLE
-- =========================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,

    -- Time
    timestamp TIMESTAMP DEFAULT NOW(),

    -- Classification
    type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 10),

    -- Network Info
    source_ip INET NOT NULL,
    destination_ip INET,
    source_port INTEGER CHECK (source_port BETWEEN 0 AND 65535),
    destination_port INTEGER CHECK (destination_port BETWEEN 0 AND 65535),
    protocol VARCHAR(10),

    -- Detection Details
    packet_count INTEGER DEFAULT 1,
    description TEXT,
    details JSONB,

    -- Status
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- INDEXES (for performance)
-- =========================================
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_source_ip ON alerts(source_ip);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity DESC);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- JSON queries (important for correlation / details)
CREATE INDEX idx_alerts_details ON alerts USING GIN(details);

-- =========================================
-- TRIGGER FUNCTION (auto update updated_at)
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- TRIGGER
-- =========================================
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- OPTIONAL (nice for demo - not required)
-- =========================================
-- Uncomment if you want quick testing data

-- INSERT INTO alerts (type, severity, source_ip, destination_ip, protocol, description)
-- VALUES 
-- ('SYN Flood', 9, '192.168.1.100', '192.168.1.1', 'TCP', 'Test SYN flood'),
-- ('Port Scan', 7, '192.168.1.101', '192.168.1.1', 'TCP', 'Test port scan');