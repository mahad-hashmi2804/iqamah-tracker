// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";

export type Database = {
    public: {
        Tables: {
            mosques: {
                Row: { id: string; name: string; address: string; created_at: string };
            };
            mosque_admins: {
                Row: { id: string; user_id: string; mosque_id: string; role: string };
            };
            iqamah_schedules: {
                Row: {
                    id: string;
                    mosque_id: string;
                    fajr: string;
                    zuhr: string;
                    asr: string;
                    maghrib: string;
                    isha: string;
                    jummah: string;
                    updated_at: string;
                    updated_by: string | null;
                };
                Update: {
                    fajr?: string;
                    zuhr?: string;
                    asr?: string;
                    maghrib?: string;
                    isha?: string;
                    jummah?: string;
                    updated_at?: string;
                    updated_by?: string;
                };
            };
        };
    };
};

export const createClient = () =>
    createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

export const supabase = createClient();