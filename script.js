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
    const upiId = "lakshmikandha03-1@okhdfcbank";
    const upiName = "Lakshmi Kandhan";
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
    event.preventDefault();

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;

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

    // Reset and show success
    cart = [];
    updateCartCount();
    document.getElementById('checkout-form').reset();
    stopQRTimer();
    closeCheckout();

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
    let timeLeft = 30;
    const timerDisplay = document.getElementById('qr-timer');
    if (timerDisplay) timerDisplay.innerText = timeLeft;

    qrTimerInterval = setInterval(() => {
        timeLeft--;
        if (timerDisplay) timerDisplay.innerText = timeLeft;

        if (timeLeft <= 0) {
            stopQRTimer();
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

function saveOrder(order) {
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
