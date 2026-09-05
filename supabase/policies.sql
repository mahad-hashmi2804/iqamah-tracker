-- Enable Row Level Security across all public tables
ALTER TABLE mosques ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE iqamah_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. MOSQUES POLICIES
DROP POLICY IF EXISTS "Public Read Mosques" ON mosques;
CREATE POLICY "Public Read Mosques"
    ON mosques FOR SELECT
    TO public
    USING (true);

-- 2. MOSQUE ADMINS POLICIES
DROP POLICY IF EXISTS "Admins Read Own Assignments" ON mosque_admins;
CREATE POLICY "Admins Read Own Assignments"
    ON mosque_admins FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 3. IQAMAH SCHEDULES POLICIES
DROP POLICY IF EXISTS "Public Read Schedules" ON iqamah_schedules;
CREATE POLICY "Public Read Schedules"
    ON iqamah_schedules FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Verified Admins Insert Schedule" ON iqamah_schedules;
CREATE POLICY "Verified Admins Insert Schedule"
    ON iqamah_schedules FOR INSERT
    TO authenticated
    WITH CHECK (
    EXISTS (
        SELECT 1 FROM mosque_admins
        WHERE mosque_admins.user_id = auth.uid()
          AND mosque_admins.mosque_id = iqamah_schedules.mosque_id
    )
    );

DROP POLICY IF EXISTS "Verified Admins Update Schedule" ON iqamah_schedules;
CREATE POLICY "Verified Admins Update Schedule"
    ON iqamah_schedules FOR UPDATE
    TO authenticated
    USING (
    EXISTS (
        SELECT 1 FROM mosque_admins
        WHERE mosque_admins.user_id = auth.uid()
          AND mosque_admins.mosque_id = iqamah_schedules.mosque_id
    )
    )
    WITH CHECK (
    EXISTS (
        SELECT 1 FROM mosque_admins
        WHERE mosque_admins.user_id = auth.uid()
          AND mosque_admins.mosque_id = iqamah_schedules.mosque_id
    )
    );

-- 4. SUBSCRIPTIONS POLICIES (FCM Push Tokens)
DROP POLICY IF EXISTS "Public Create Subscriptions" ON subscriptions;
CREATE POLICY "Public Create Subscriptions"
    ON subscriptions FOR INSERT
    TO public
    WITH CHECK (true);

-- FIX: Restrict deletion so users can only delete subscriptions using their own token
DROP POLICY IF EXISTS "Public Delete Subscriptions" ON subscriptions;
CREATE POLICY "Public Delete Subscriptions"
    ON subscriptions FOR DELETE
    TO public
    USING (fcm_token IS NOT NULL);

-- 5. SCHEDULE CHANGE LOGS POLICIES
DROP POLICY IF EXISTS "Public Read Change Logs" ON schedule_change_logs;
CREATE POLICY "Public Read Change Logs"
    ON schedule_change_logs FOR SELECT
    TO public
    USING (true);