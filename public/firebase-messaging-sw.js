importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBNzVCQX7SHg_Xz8rwVRuPqGHteWGLs45E",
    authDomain: "iqamah-tracker-push.firebaseapp.com",
    projectId: "iqamah-tracker-push",
    storageBucket: "iqamah-tracker-push.firebasestorage.app",
    messagingSenderId: "178942306567",
    appId: "1:178942306567:web:923e5e6a1594457b117da2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title || 'Iqamah Update';
    const notificationOptions = {
        body: payload.notification.body || 'Prayer time updated.',
        icon: '/icon.png',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});