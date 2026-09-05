import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { createClient } from "@supabase/supabase-js";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function requestNotificationToken(): Promise<string | null> {
    try {
        const supported = await isSupported();
        if (!supported) return null;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("Notification permission was denied.");
            return null;
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        return currentToken || null;
    } catch (error) {
        console.error("An error occurred while retrieving FCM token:", error);
        return null;
    }
}

export async function subscribeToMosque(mosqueId: string): Promise<boolean> {
    try {
        const fcmToken = await requestNotificationToken();
        if (!fcmToken) return false;

        const { error } = await supabase
            .from("subscriptions")
            .insert([{ mosque_id: mosqueId, fcm_token: fcmToken }]);

        // Code 23505 indicates a duplicate entry (already subscribed)
        if (error && error.code !== "23505") {
            console.error("Failed to insert subscription into Supabase:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Subscription failed:", err);
        return false;
    }
}

export async function unsubscribeFromMosque(mosqueId: string): Promise<boolean> {
    try {
        const fcmToken = await requestNotificationToken();
        if (!fcmToken) return false;

        const { error } = await supabase
            .from("subscriptions")
            .delete()
            .match({ mosque_id: mosqueId, fcm_token: fcmToken });

        if (error) {
            console.error("Failed to delete subscription:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Unsubscribe execution error:", err);
        return false;
    }
}