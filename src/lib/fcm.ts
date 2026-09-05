import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/lib/supabaseClient";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Helper to convert URL-safe base64 VAPID key to Uint8Array required by PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function requestNotificationToken(): Promise<string | null> {
    try {
        const supported = await isSupported();
        if (!supported) {
            console.warn("Messaging is not supported in this browser.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("Notification permission was denied.");
            return null;
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
            "BMhpArooyhhfvqLchMV3vsjbUPEgujvIYlygF84J_B37j6x_lsd0IBgwhi9TWAAImk84IihKx5lr2EnO-onQq1U";

        // Convert key to Uint8Array to prevent PushManager InvalidAccessError
        const applicationServerKey = urlBase64ToUint8Array(rawVapidKey.trim());

        const messaging = getMessaging(app);

        const currentToken = await getToken(messaging, {
            vapidKey: rawVapidKey.trim(),
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

        const { error } = await (supabase.from("subscriptions") as any)
            .insert([{ mosque_id: mosqueId, fcm_token: fcmToken }]);

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