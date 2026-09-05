import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

interface ScheduleRecord {
    id: string;
    mosque_id: string;
    fajr: string;
    zuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
    [key: string]: string;
}

interface WebhookPayload {
    old_record?: ScheduleRecord;
    new_record?: ScheduleRecord;
}

const PRAYER_KEYS = ["fajr", "zuhr", "asr", "maghrib", "isha", "jummah"] as const;

serve(async (req: Request): Promise<Response> => {
    // Always wrap edge executions to prevent unhandled process crashes
    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" },
            });
        }

        const payload: WebhookPayload = await req.json().catch(() => ({}));
        const { old_record, new_record } = payload;

        // Validate incoming payload integrity
        if (!old_record || !new_record) {
            return new Response(
                JSON.stringify({ status: "ignored", reason: "Missing record payload" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // 1. Calculate delta between OLD and NEW schedules
        const timeChanges: string[] = [];
        for (const prayer of PRAYER_KEYS) {
            const oldTime = old_record[prayer];
            const newTime = new_record[prayer];

            if (oldTime && newTime && oldTime !== newTime) {
                const formattedPrayer = prayer.charAt(0).toUpperCase() + prayer.slice(1);
                timeChanges.push(`${formattedPrayer}: ${oldTime} ➔ ${newTime}`);
            }
        }

        // Exit gracefully if no prayer times actually changed
        if (timeChanges.length === 0) {
            return new Response(
                JSON.stringify({ status: "success", message: "No prayer time changes detected" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase Service Role Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing environment configuration for Supabase client.");
            return new Response(
                JSON.stringify({ error: "Server environment misconfiguration" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Query Mosque details and FCM Subscribers
        const mosqueId = new_record.mosque_id;

        const [mosqueRes, subsRes] = await Promise.all([
            supabase.from("mosques").select("name").eq("id", mosqueId).maybeSingle(),
            supabase.from("subscriptions").select("fcm_token").eq("mosque_id", mosqueId),
        ]);

        if (mosqueRes.error) {
            console.error("Error fetching mosque info:", mosqueRes.error);
        }

        const mosqueName = mosqueRes.data?.name || "Your Mosque";
        const tokens: string[] = (subsRes.data || [])
            .map((sub: { fcm_token: string }) => sub.fcm_token)
            .filter((token: string) => Boolean(token));

        // Exit gracefully if zero subscribers exist for this mosque
        if (tokens.length === 0) {
            return new Response(
                JSON.stringify({ status: "success", message: "No subscribers found for this mosque" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // 3. Dispatch Notification via FCM REST API
        const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
        if (!fcmServerKey) {
            console.error("FCM_SERVER_KEY variable is missing.");
            return new Response(
                JSON.stringify({ error: "FCM credential missing" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const notificationTitle = `Iqamah Change: ${mosqueName}`;
        const notificationBody = timeChanges.join(" | ");

        // Split token array into batches of 1000 (FCM legacy multicast batch limit)
        const BATCH_SIZE = 1000;
        const batchPromises = [];

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
            const tokenBatch = tokens.slice(i, i + BATCH_SIZE);

            const fcmPayload = {
                registration_ids: tokenBatch,
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                },
                data: {
                    mosque_id: mosqueId,
                    updated_at: new_record.updated_at || new Date().toISOString(),
                },
                priority: "high",
            };

            batchPromises.push(
                fetch("https://fcm.googleapis.com/fcm/send", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `key=${fcmServerKey}`,
                    },
                    body: JSON.stringify(fcmPayload),
                }).then(async (res) => {
                    const responseData = await res.json().catch(() => null);
                    return { status: res.status, ok: res.ok, data: responseData };
                })
            );
        }

        const results = await Promise.all(batchPromises);
        const failedBatches = results.filter((r) => !r.ok);

        if (failedBatches.length > 0) {
            console.error("Some FCM batches failed:", JSON.stringify(failedBatches));
        }

        return new Response(
            JSON.stringify({
                status: "success",
                subscribersNotified: tokens.length,
                changes: timeChanges,
                dispatches: results,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Unhandled Edge Function Exception:", errorMessage);

        return new Response(
            JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});