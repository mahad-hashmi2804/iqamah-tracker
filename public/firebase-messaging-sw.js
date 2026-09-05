importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Initialize Firebase app in Service Worker context using Webpack/env runtime definitions or hardcoded fallback config values
firebase.initializeApp({
    apiKey: "YOUR_NEXT_PUBLIC_FIREBASE_API_KEY",
    projectId: "YOUR_NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    messagingSenderId: "YOUR_NEXT_PUBLIC_FIREBASE_SENDER_ID",
    appId: "YOUR_NEXT_PUBLIC_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message: ", payload);

    const notificationTitle = payload.notification?.title || "Iqamah Schedule Update";
    const notificationOptions = {
        body: payload.notification?.body || "Iqamah times have been updated.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: "iqamah-update-alert",
        renotify: true,
        data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});