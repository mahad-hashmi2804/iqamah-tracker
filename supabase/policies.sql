-- Enable Row Level Security across all public tables
ALTER TABLE mosques ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE iqamah_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. MOSQUES POLICIES
-- Public can view mosques
CREATE POLICY "Public Read Mosques"
    ON mosques FOR SELECT
                              USING (true);

-- 2. MOSQUE ADMINS POLICIES
-- Admins can view their own assignment or assignment records of their assigned mosques
CREATE POLICY "Admins Read Own Assignments"
    ON mosque_admins FOR SELECT
                                    TO authenticated
                                    USING (user_id = auth.uid());

-- 3. IQAMAH SCHEDULES POLICIES
-- Public can view prayer schedules
CREATE POLICY "Public Read Schedules"
    ON iqamah_schedules FOR SELECT
                                       USING (true);

-- Strictly verified mosque admins can insert or update schedules for their assigned mosque
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
-- Public users (anon & authenticated) can register FCM tokens
CREATE POLICY "Public Create Subscriptions"
    ON subscriptions FOR INSERT
    TO public
    WITH CHECK (true);

-- Public users can unsubscribe / remove FCM tokens
CREATE POLICY "Public Delete Subscriptions"
    ON subscriptions FOR DELETE
TO public
    USING (true);

-- 5. SCHEDULE CHANGE LOGS POLICIES
-- Public or authenticated users can read change logs
CREATE POLICY "Public Read Change Logs"
    ON schedule_change_logs FOR SELECT
                                           USING (true);