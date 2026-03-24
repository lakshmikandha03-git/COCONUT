// ============================================================
// Firebase Messaging Service Worker
// MKP Coconut Shop - Background Push Notifications
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCAIF1L2MI4Jc_4NmrVdgALkuiQOb6MsQk",
    authDomain: "coconut-12122023.firebaseapp.com",
    projectId: "coconut-12122023",
    storageBucket: "coconut-12122023.firebasestorage.app",
    messagingSenderId: "676377488059",
    appId: "1:676377488059:web:3885b1e9e130fe03f1979e"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages (when tab is closed or browser is minimized)
messaging.onBackgroundMessage(function (payload) {
    console.log('[SW] Background message received:', payload);

    const { title, body, icon } = payload.notification || {};

    const notificationTitle = title || '✅ Order Confirmed! - MKP Coconut Shop';
    const notificationOptions = {
        body: body || 'Your order has been placed successfully.',
        icon: icon || '/images/coconut-item.png',
        badge: '/images/coconut-item.png',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        actions: [
            { action: 'view', title: '📦 View Orders' },
            { action: 'close', title: 'Close' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'view') {
        clients.openWindow('/home.html');
    }
});
