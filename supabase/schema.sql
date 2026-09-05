-- Enable PostGIS extension for spatial queries (e.g., radius searches)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. MOSQUES TABLE
CREATE TABLE IF NOT EXISTS mosques (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Spatial Index (GiST) for fast geographical bounding-box and distance queries
CREATE INDEX IF NOT EXISTS idx_mosques_location ON mosques USING GIST(location);

-- 2. MOSQUE ADMINS TABLE
CREATE TABLE IF NOT EXISTS mosque_admins (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('primary_admin', 'volunteer')) DEFAULT 'volunteer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mosque_id)
    );

-- Indexes for Admin Lookup Performance
CREATE INDEX IF NOT EXISTS idx_mosque_admins_user ON mosque_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_mosque_admins_mosque ON mosque_admins(mosque_id);

-- 3. IQAMAH SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS iqamah_schedules (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
    fajr TIME NOT NULL,
    zuhr TIME NOT NULL,
    asr TIME NOT NULL,
    maghrib TIME NOT NULL,
    isha TIME NOT NULL,
    jummah TIME NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_mosque_schedule UNIQUE (mosque_id)
    );

-- 4. SCHEDULE CHANGE LOGS TABLE
CREATE TABLE IF NOT EXISTS schedule_change_logs (
                                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
    prayer_name TEXT NOT NULL,
    old_time TIME NOT NULL,
    new_time TIME NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
    );

-- Index for querying audit logs by mosque
CREATE INDEX IF NOT EXISTS idx_change_logs_mosque ON schedule_change_logs(mosque_id);

-- 5. PWA SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
                                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mosque_id, fcm_token)
    );

-- Index for bulk retrieval during push broadcasts
CREATE INDEX IF NOT EXISTS idx_subscriptions_mosque ON subscriptions(mosque_id);

-- AUTOMATED AUDIT TRIGGER FOR IQAMAH SCHEDULE CHANGES
CREATE OR REPLACE FUNCTION log_iqamah_schedule_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.fajr IS DISTINCT FROM NEW.fajr) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'fajr', OLD.fajr, NEW.fajr, auth.uid());
END IF;

    IF (OLD.zuhr IS DISTINCT FROM NEW.zuhr) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'zuhr', OLD.zuhr, NEW.zuhr, auth.uid());
END IF;

    IF (OLD.asr IS DISTINCT FROM NEW.asr) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'asr', OLD.asr, NEW.asr, auth.uid());
END IF;

    IF (OLD.maghrib IS DISTINCT FROM NEW.maghrib) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'maghrib', OLD.maghrib, NEW.maghrib, auth.uid());
END IF;

    IF (OLD.isha IS DISTINCT FROM NEW.isha) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'isha', OLD.isha, NEW.isha, auth.uid());
END IF;

    IF (OLD.jummah IS DISTINCT FROM NEW.jummah) THEN
        INSERT INTO schedule_change_logs (mosque_id, prayer_name, old_time, new_time, changed_by)
        VALUES (NEW.mosque_id, 'jummah', OLD.jummah, NEW.jummah, auth.uid());
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_audit_iqamah_changes
AFTER UPDATE ON iqamah_schedules
                    FOR EACH ROW EXECUTE FUNCTION log_iqamah_schedule_changes();