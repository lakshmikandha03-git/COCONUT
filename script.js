const products = [
    {
        id: 1,
        name: "Fresh Coconut",
        price: 50,
        unit: "1kg",
        image: "images/fresh.png",
        desc: "Sweet water and tender meat."
    },
    {
        id: 2,
        name: "Coconut Water",
        price: 25,
        unit: "1lt",
        image: "images/water.png",
        desc: "Refreshing natural electrolyte drink."
    },
    {
        id: 3,
        name: "Dry Coconut",
        price: 60,
        unit: "1kg",
        image: "images/dry.png",
        desc: "Perfect for cooking and oil extraction."
    },
    {
        id: 4,
        name: "Coconut Coir",
        price: 40,
        unit: "1kg",
        image: "images/coir.png",
        desc: "Natural fiber for gardening and ropes."
    }
];

let cart = [];
let qrTimerInterval = null;


// ============================================================
// WHATSAPP ADMIN NOTIFICATION
// ============================================================
const ADMIN_WHATSAPP_NUMBER = "919894869581"; // Admin number with country code

function sendWhatsAppToAdmin(order) {
    const itemsList = order.items.join(', ');
    const paymentMethod = order.payment === 'cash' ? 'Cash on Delivery' : order.payment.toUpperCase();

    const message =
        `🛒 *New Order Confirmed - MKP Coconut Shop*\n\n` +
        `📋 *Order ID:* #${order.id.toString().slice(-6)}\n` +
        `📅 *Date:* ${order.date}\n\n` +
        `👤 *Customer Details*\n` +
        `• Name: ${order.name}\n` +
        `• Phone: ${order.phone}\n` +
        `• Address: ${order.address}\n\n` +
        `📦 *Order Details*\n` +
        `• Items: ${itemsList}\n` +
        `• Total: ₹${order.total}\n` +
        `• Payment: ${paymentMethod}\n\n` +
        `✅ Please process this order.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
}

function sendWhatsAppToCustomer(order) {
    const itemsList = order.items.join(', ');
    const message =
        `✅ *Order Confirmed! - MKP Coconut Shop*\n\n` +
        `Hi ${order.name},\n` +
        `Thank you for shopping with us! Your order #${order.id.toString().slice(-6)} has been confirmed.\n\n` +
        `📦 *Items:* ${itemsList}\n` +
        `💰 *Total:* ₹${order.total}\n\n` +
        `We are preparing your fresh coconuts for delivery. We will contact you soon!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/91${order.phone}?text=${encodedMessage}`;
    
    // Using a timeout to prevent popup blockers for multiple tabs
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
    }, 1000);
}

function sendWhatsAppCancellationToAdmin(details) {
    const message =
        `⚠️ *Order Cancelled - MKP Coconut Shop*\n\n` +
        `👤 *Customer:* ${details.name || 'Unknown'}\n` +
        `📱 *Phone:* ${details.phone || 'N/A'}\n` +
        `📦 *Items:* ${details.items || 'N/A'}\n` +
        `💰 *Total:* ₹${details.total || '0'}\n` +
        `📝 *Reason:* ${details.reason}\n\n` +
        `The customer did not complete the checkout process.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
}

// ============================================================
// NOTIFICATION PERMISSION
// ============================================================
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendOrderNotification(order) {
    if (!('Notification' in window)) return;

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
            icon: 'images/coconut-item.png',
            badge: 'images/coconut-item.png',
            tag: 'order-confirm-' + order.id
        });
    } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body,
                    icon: 'images/coconut-item.png',
                    badge: 'images/coconut-item.png',
                    tag: 'order-confirm-' + order.id
                });
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for user session
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user && user.role === 'user') {
        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${user.name}!`;

        // Pre-fill checkout form
        if (document.getElementById('name')) document.getElementById('name').value = user.name;
        if (document.getElementById('phone')) document.getElementById('phone').value = user.pass;
    }

    // Request notification permission early
    requestNotificationPermission();

    // Initialize Firebase Cloud Messaging with user's phone
    if (user && user.phone || user && user.pass) {
        const phone = (user && (user.phone || user.pass)) || null;
        if (window.firebaseDB && window.firebaseDB.initFCM) {
            window.firebaseDB.initFCM(phone);
        }
    }

    renderProducts();
    updateCartCount();
});

function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <span class="product-price">₹${product.price} / ${product.unit}</span>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">${product.desc}</p>
                
                <div class="quantity-control" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem;">
                    <button class="qty-btn" onclick="changeQty(${product.id}, -1)">-</button>
                    <input type="number" id="qty-${product.id}" value="1" min="1" class="qty-input" readonly style="width: 40px; text-align: center; border: none; font-weight: 600; font-size: 1.1rem;">
                    <button class="qty-btn" onclick="changeQty(${product.id}, 1)">+</button>
                </div>

                <div class="btn-group">
                    <button class="btn-buy" onclick="buyNow(${product.id})">Buy Now</button>
                    <button class="btn-add" id="btn-add-${product.id}" onclick="addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

function changeQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (input) {
        let val = parseInt(input.value) + delta;
        if (val < 1) val = 1;
        input.value = val;
    }
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const qtyInput = document.getElementById(`qty-${id}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    // Check if item already in cart
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }

    if (qtyInput) qtyInput.value = 1;

    updateCartCount();
    renderCartItems();

    // Visual feedback
    const btn = document.getElementById(`btn-add-${id}`);
    if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "Added ✓";
        btn.style.backgroundColor = "#4F772D";
        btn.style.color = "white";

        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = "";
            btn.style.color = "";
        }, 2000);
    }
}

function buyNow(id) {
    addToCart(id);
    openCheckout();
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.innerText = totalItems;
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
    if (sidebar) sidebar.classList.toggle('hidden');
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container || !totalEl) return;

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888;'>Your cart is empty.</p>";
        totalEl.innerText = "0";
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div style="flex-grow: 1;">
                    <strong>${item.name}</strong><br>
                    <small>₹${item.price} x ${item.quantity} = ₹${itemTotal}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                     <div style="display: flex; align-items: center; gap: 5px;">
                        <button onclick="updateCartQty(${index}, -1)" style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid #ddd; cursor: pointer;">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQty(${index}, 1)" style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid #ddd; cursor: pointer;">+</button>
                    </div>
                    <button onclick="removeFromCart(${index})" style="color:red; border:none; background:none; cursor:pointer; font-size: 1.2rem;">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = total;
}

function updateCartQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) {
        removeFromCart(index);
    } else {
        updateCartCount();
        renderCartItems();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    renderCartItems();
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function openCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    const sidebar = document.getElementById('cart-sidebar');
    const modal = document.getElementById('checkout-modal');
    if (sidebar) sidebar.classList.add('hidden');
    if (modal) modal.classList.remove('hidden');

    // Update summary in checkout
    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const checkoutTotal = document.getElementById('checkout-total');
    if (checkoutTotal) checkoutTotal.innerText = total;

    const qrAmount = document.getElementById('qr-amount');
    if (qrAmount) qrAmount.innerText = total;

    // Update UPI Links
    const upiId = "kesavaharimari1004-3@okhdfcbank";
    const upiName = "Kesava Hari Mari";
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR`;

    const upiLink = document.getElementById('upi-link');
    const upiBtn = document.getElementById('upi-btn');
    const qrImg = document.getElementById('payment-qr');

    if (upiLink) upiLink.href = upiUri;
    if (upiBtn) upiBtn.href = upiUri;
    if (qrImg) {
        // Using a public QR API to generate a QR for the UPI URI
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
    }

    const summary = document.getElementById('order-summary');
    if (summary) {
        summary.innerHTML = cart.map(item => `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.9rem;">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `).join('') + '<hr style="margin:1rem 0; border:0; border-top:1px solid #eee;">';
    }
}

function closeCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
    stopQRTimer();
}

function cancelOrder() {
    if (confirm("Do you want to cancel this order?")) {
        // Collect current checkout details if any
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const details = {
            name: name,
            phone: phone,
            items: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            reason: "Manual Cancellation by User"
        };
        
        // Notify Admin of cancellation
        sendWhatsAppCancellationToAdmin(details);

        closeCheckout();

        // Show cancelled overlay briefly
        const msgEl = document.getElementById('cancelled-msg');
        if (msgEl) msgEl.innerText = "The order has been cancelled. Returning to products...";

        const overlay = document.getElementById('cancelled-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Automatically return to products after 2 seconds
        setTimeout(() => {
            if (overlay) overlay.classList.add('hidden');
            scrollToSection('products');
        }, 2000);
    }
}

function processOrder(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;

    const paymentRadio = document.querySelector('input[name="payment"]:checked');
    if (!paymentRadio) {
        alert("Please select a payment method");
        return;
    }
    const payment = paymentRadio.value;

    if (!name || !phone || !address) {
        alert("Please fill in all shipping details");
        return;
    }

    const order = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        name,
        phone,
        address,
        payment,
        items: cart.map(i => `${i.name} (x${i.quantity})`),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    saveOrder(order);

    // Send WhatsApp notification to admin
    sendWhatsAppToAdmin(order);

    // Send WhatsApp notification to customer
    sendWhatsAppToCustomer(order);

    // Send FCM order confirmation notification
    if (window.firebaseDB && window.firebaseDB.sendFCMOrderNotification) {
        window.firebaseDB.sendFCMOrderNotification(order);
    } else {
        sendOrderNotification(order); // fallback
    }

    // Reset and show success
    cart = [];
    updateCartCount();
    document.getElementById('checkout-form').reset();
    stopQRTimer();
    closeCheckout();

    const successTitle = document.getElementById('success-title');
    const successSubtitle = document.getElementById('success-subtitle');
    
    if (payment === 'gpay' || payment === 'phonepe') {
        if (successTitle) successTitle.innerText = "Delivery Confirmed!";
        if (successSubtitle) successSubtitle.innerText = "Your payment was received. We are preparing your coconuts for delivery.";
    } else {
        if (successTitle) successTitle.innerText = "Order Placed Successfully!";
        if (successSubtitle) successSubtitle.innerText = "Thank you for shopping with MKP Coconut Shop.";
    }

    const success = document.getElementById('success-overlay');
    if (success) success.classList.remove('hidden');
}

function togglePaymentQR() {
    const checked = document.querySelector('input[name="payment"]:checked');
    if (!checked) return;
    const paymentMethod = checked.value;
    const qrSection = document.getElementById('qr-code-section');
    if (!qrSection) return;

    if (paymentMethod === 'gpay' || paymentMethod === 'phonepe') {
        qrSection.classList.remove('hidden');
        startQRTimer();
    } else {
        qrSection.classList.add('hidden');
        stopQRTimer();
    }
}

function startQRTimer() {
    stopQRTimer(); // Clear any existing timer
    let timeLeft = 20;
    const timerDisplay = document.getElementById('qr-timer');
    const timerContainer = document.getElementById('qr-timer-container');

    if (timerDisplay) timerDisplay.innerText = timeLeft;
    if (timerContainer) {
        timerContainer.style.color = "#d32f2f";
        timerContainer.innerHTML = `Payment window expires in: <span id="qr-timer">${timeLeft}</span>s`;
    }

    // Simulated Payment Detection
    // After 10 seconds of showing QR, it will "detect" the payment
    setTimeout(() => {
        const checked = document.querySelector('input[name="payment"]:checked');
        if (checked && (checked.value === 'gpay' || checked.value === 'phonepe')) {
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;

            // Only auto-submit if form is filled
            if (name && phone && address) {
                // Stop the countdown timer
                stopQRTimer();

                if (timerContainer) {
                    timerContainer.style.color = "#166534";
                    timerContainer.innerHTML = `
                        <div style="background: #dcfce7; padding: 1rem; border-radius: 10px; text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 0.3rem;">✅</div>
                            <strong style="font-size: 1.1rem;">Payment Successful!</strong>
                            <p style="font-size: 0.85rem; color: #166534; margin-top: 0.3rem;">Confirming delivery details...</p>
                        </div>`;
                }

                // Hide QR code image
                const qrImg = document.getElementById('payment-qr');
                if (qrImg) qrImg.style.display = 'none';
                const upiBtn = document.getElementById('upi-btn');
                if (upiBtn) upiBtn.style.display = 'none';

                // Process order after 2 seconds
                setTimeout(() => {
                    const qrSection = document.getElementById('qr-code-section');
                    if (!qrSection.classList.contains('hidden')) {
                        // Restore QR elements for future use
                        if (qrImg) qrImg.style.display = '';
                        if (upiBtn) upiBtn.style.display = '';
                        
                        // Pass mock event to processOrder
                        processOrder();
                    }
                }, 2000);
            }
        }
    }, 10000);

    qrTimerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('qr-timer');
        if (timerEl) timerEl.innerText = timeLeft;

        if (timeLeft <= 0) {
            stopQRTimer();
            
            // Collect current checkout details
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const details = {
                name: name,
                phone: phone,
                items: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                reason: "Payment Timeout (20s reached)"
            };
            
            // Notify Admin of timeout
            sendWhatsAppCancellationToAdmin(details);

            closeCheckout();
            document.getElementById('checkout-form').reset();

            // Show cancelled overlay
            const msgEl = document.getElementById('cancelled-msg');
            if (msgEl) msgEl.innerText = "Payment time exceeded. Your checkout has been cancelled.";

            const cancelled = document.getElementById('cancelled-overlay');
            if (cancelled) cancelled.classList.remove('hidden');
        }
    }, 1000);
}

function stopQRTimer() {
    if (qrTimerInterval) {
        clearInterval(qrTimerInterval);
        qrTimerInterval = null;
    }
}

async function saveOrder(order) {
    // Try saving to Firebase first
    if (window.firebaseDB && window.firebaseDB.saveOrderToFirebase) {
        try {
            const result = await window.firebaseDB.saveOrderToFirebase(order);
            if (result.success) {
                console.log('Order saved to Firebase:', result.orderId);
                return;
            }
        } catch (err) {
            console.error('Firebase save failed, using localStorage:', err);
        }
    }
    // Fallback to localStorage
    let sales = JSON.parse(localStorage.getItem('mkp_sales') || '[]');
    sales.push(order);
    localStorage.setItem('mkp_sales', JSON.stringify(sales));
}

function closeSuccess() {
    const success = document.getElementById('success-overlay');
    if (success) success.classList.add('hidden');
}

function closeCancelled() {
    const cancelled = document.getElementById('cancelled-overlay');
    if (cancelled) cancelled.classList.add('hidden');
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

async function viewMyOrders() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    const modal = document.getElementById('orders-modal');
    const list = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');

    if (modal) modal.classList.remove('hidden');

    // Show loading state
    if (list) list.innerHTML = '<p style="text-align:center; color:#888; padding: 2rem;">Loading orders from database...</p>';
    if (noOrders) noOrders.classList.add('hidden');

    let mySales = [];

    // Try Firebase first
    if (window.firebaseDB && window.firebaseDB.fetchUserOrders) {
        try {
            const phone = user.phone || user.pass;
            const result = await window.firebaseDB.fetchUserOrders(phone);
            if (result.success && result.orders.length > 0) {
                mySales = result.orders;
            }
        } catch (err) {
            console.error('Firebase fetch failed:', err);
        }
    }

    // Fallback to localStorage if Firebase returned nothing
    if (mySales.length === 0) {
        const allSales = JSON.parse(localStorage.getItem('mkp_sales') || '[]');
        mySales = allSales.filter(s => s.phone === (user.phone || user.pass) || s.name === user.name);
    }

    if (mySales.length === 0) {
        if (noOrders) noOrders.classList.remove('hidden');
        if (list) list.innerHTML = '';
        return;
    }

    if (noOrders) noOrders.classList.add('hidden');
    if (list) {
        list.innerHTML = mySales.map(order => `
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; border-left: 5px solid #4F772D;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 700; color: #1e293b;">Order #${order.id.toString().slice(-6)}</span>
                    <span style="font-size: 0.85rem; color: #64748b;">${order.date}</span>
                </div>
                <div style="margin-bottom: 0.5rem; font-size: 0.95rem;">
                    <strong>Items:</strong> ${order.items.join(', ')}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #4F772D;">Total: ₹${order.total}</span>
                    <span style="font-size: 0.8rem; background: #dcfce7; color: #166534; padding: 0.2rem 0.6rem; border-radius: 50px; font-weight: 600;">
                        ${order.payment === 'cash' ? 'COD' : 'PAID'}
                    </span>
                </div>
            </div>
        `).reverse().join('');
    }
}

function closeOrders() {
    const modal = document.getElementById('orders-modal');
    if (modal) modal.classList.add('hidden');
}

function goBackToPayment() {
    const qrSection = document.getElementById('qr-code-section');
    if (qrSection) qrSection.classList.add('hidden');
    stopQRTimer();

    // Uncheck the payment radio buttons to force a new selection
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    paymentRadios.forEach(radio => radio.checked = false);
}
