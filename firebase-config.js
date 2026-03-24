// ============================================================
// Firebase Configuration & Database Functions
// MKP Coconut Shop - Firebase Integration (Compat SDK)
// ============================================================

// Firebase is loaded via <script> tags in the HTML files (compat SDK)
// This file uses the global firebase object

const firebaseConfig = {
    apiKey: "AIzaSyCAIF1L2MI4Jc_4NmrVdgALkuiQOb6MsQk",
    authDomain: "coconut-12122023.firebaseapp.com",
    projectId: "coconut-12122023",
    storageBucket: "coconut-12122023.firebasestorage.app",
    messagingSenderId: "676377488059",
    appId: "1:676377488059:web:3885b1e9e130fe03f1979e",
    measurementId: "G-X6NEX27HX8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
// USER AUTHENTICATION (Register / Login)
// ============================================================

/**
 * Register a new user in Firestore 'users' collection
 * Uses phone number as the unique document ID
 */
async function registerUser(name, phone) {
    try {
        const userRef = db.collection("users").doc(phone);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
            return { success: true, exists: true, data: userSnap.data() };
        }

        const userData = {
            name: name,
            phone: phone,
            role: "user",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };

        await userRef.set(userData);
        return { success: true, exists: false, data: userData };
    } catch (error) {
        console.error("Error registering user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Login user — checks if user exists, auto-registers if not
 */
async function loginUser(name, phone) {
    try {
        const userRef = db.collection("users").doc(phone);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
            const userData = userSnap.data();
            await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
            return { success: true, data: { ...userData, phone } };
        } else {
            const result = await registerUser(name, phone);
            if (result.success) {
                return { success: true, data: { name, phone, role: "user" } };
            }
            return result;
        }
    } catch (error) {
        console.error("Error logging in:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin login — checks hardcoded admin credentials
 */
async function loginAdmin(name, password) {
    if (name === "23bit66" && password === "12122023") {
        return { success: true, data: { name, role: "admin" } };
    }
    return { success: false, error: "Invalid admin credentials" };
}

// ============================================================
// ORDER MANAGEMENT
// ============================================================

/**
 * Save a new order to Firestore 'orders' collection
 */
async function saveOrderToFirebase(order) {
    try {
        const orderData = {
            ...order,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: "confirmed"
        };

        const docRef = await db.collection("orders").add(orderData);
        console.log("Order saved with ID:", docRef.id);

        // Also save to localStorage as backup
        let sales = JSON.parse(localStorage.getItem("mkp_sales") || "[]");
        sales.push(order);
        localStorage.setItem("mkp_sales", JSON.stringify(sales));

        return { success: true, orderId: docRef.id };
    } catch (error) {
        console.error("Error saving order:", error);
        let sales = JSON.parse(localStorage.getItem("mkp_sales") || "[]");
        sales.push(order);
        localStorage.setItem("mkp_sales", JSON.stringify(sales));
        return { success: false, error: error.message };
    }
}

/**
 * Fetch orders for a specific user (by phone number)
 */
async function fetchUserOrders(phone) {
    try {
        const snapshot = await db.collection("orders").where("phone", "==", phone).get();
        const orders = [];
        snapshot.forEach((doc) => {
            orders.push({ firebaseId: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => (b.id || 0) - (a.id || 0));
        return { success: true, orders };
    } catch (error) {
        console.error("Error fetching user orders:", error);
        const allSales = JSON.parse(localStorage.getItem("mkp_sales") || "[]");
        const userOrders = allSales.filter(s => s.phone === phone);
        return { success: true, orders: userOrders, source: "localStorage" };
    }
}

/**
 * Fetch ALL orders (for admin dashboard)
 */
async function fetchAllOrders() {
    try {
        const snapshot = await db.collection("orders").get();
        const orders = [];
        snapshot.forEach((doc) => {
            orders.push({ firebaseId: doc.id, ...doc.data() });
        });
        orders.sort((a, b) => (b.id || 0) - (a.id || 0));
        return { success: true, orders };
    } catch (error) {
        console.error("Error fetching all orders:", error);
        const allSales = JSON.parse(localStorage.getItem("mkp_sales") || "[]");
        return { success: true, orders: allSales, source: "localStorage" };
    }
}

/**
 * Fetch ALL registered users (for admin dashboard)
 */
async function fetchAllUsers() {
    try {
        const snapshot = await db.collection("users").get();
        const users = [];
        snapshot.forEach((doc) => {
            users.push({ phone: doc.id, ...doc.data() });
        });
        return { success: true, users };
    } catch (error) {
        console.error("Error fetching users:", error);
        return { success: false, users: [], error: error.message };
    }
}

// ============================================================
// FIREBASE CLOUD MESSAGING (FCM) - Push Notifications
// ============================================================

const VAPID_KEY = "BJbkFgsJgOmzuAwbElVq0dTM1926cF8gHfbBs2Bz8Z5GEwc9bGnf6mt9x7UYVM-mflfmKQq5NWY1HH032-ml";

let messagingInstance = null;

/**
 * Initialize FCM: register service worker, get token, save to Firestore
 * @param {string} phone - user's phone number (used as Firestore doc ID)
 */
async function initFCM(phone) {
    try {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported');
            return;
        }

        // Register the Firebase Messaging service worker using relative path
        // (works for both localhost and GitHub Pages subdirectories)
        const swPath = new URL('./firebase-messaging-sw.js', window.location.href).pathname;
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('[FCM] Service Worker registered:', registration.scope);

        // Initialize messaging only if firebase.messaging is available
        if (typeof firebase.messaging !== 'function') {
            console.warn('[FCM] firebase.messaging not loaded');
            return;
        }

        messagingInstance = firebase.messaging();

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('[FCM] Notification permission denied');
            return;
        }

        // Get FCM token
        const token = await messagingInstance.getToken({
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('[FCM] Token:', token);
            // Save token to Firestore under user's document
            if (phone) {
                await db.collection('users').doc(phone).update({ fcmToken: token });
                console.log('[FCM] Token saved to Firestore for phone:', phone);
            }
            // Cache token locally
            localStorage.setItem('fcmToken', token);
        }

        // Handle foreground messages (when tab is open/active)
        messagingInstance.onMessage((payload) => {
            console.log('[FCM] Foreground message:', payload);
            const { title, body } = payload.notification || {};
            if (title && Notification.permission === 'granted') {
                new Notification(title, {
                    body: body || '',
                    icon: './images/coconut-item.png',
                    badge: './images/coconut-item.png'
                });
            }
        });

    } catch (error) {
        console.error('[FCM] Initialization error:', error);
    }
}

/**
 * Send order confirmation notification via browser Notification API
 * (FCM token is stored in Firestore; notifications fire via FCM service worker or directly)
 * @param {object} order
 */
function sendFCMOrderNotification(order) {
    const title = '✅ Order Confirmed! - MKP Coconut Shop';
    const body =
        `Hi ${order.name}! Your order has been confirmed.\n` +
        `📦 Items: ${order.items.join(', ')}\n` +
        `💰 Total: ₹${order.total}\n` +
        `📱 Phone: ${order.phone}\n` +
        `💳 Payment: ${order.payment === 'cash' ? 'Cash on Delivery' : order.payment.toUpperCase()}`;

    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: './images/coconut-item.png',
            badge: './images/coconut-item.png',
            tag: 'order-' + order.id,
            vibrate: [200, 100, 200]
        });
    }
}

// ============================================================
// Make functions globally available
// ============================================================
window.firebaseDB = {
    registerUser,
    loginUser,
    loginAdmin,
    saveOrderToFirebase,
    fetchUserOrders,
    fetchAllOrders,
    fetchAllUsers,
    initFCM,
    sendFCMOrderNotification
};
