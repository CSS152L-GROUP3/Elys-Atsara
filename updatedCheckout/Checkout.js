import {
    getCurrentUser,
    fetchShippingOptions,
    fetchDefaultAddress,
    fetchCustomerInfo
} from '../supabaseClient/checkout.js';

import { supabase } from '../supabaseClient/supabase.js';
import { getCartItems } from '../supabaseClient/cart.js';

let shippingOptions = [];
let defaultAddress = null;

const urlParams = new URLSearchParams(window.location.search);
const status = urlParams.get('status');

if (status === 'success') {
    alert("✅ Payment successful! Your order has been received.");
} else if (status === 'cancel') {
    alert("❌ Payment was canceled or failed. Please try again.");
}

async function getCurrentUserWithRetry(retries = 5, delay = 300) {
    for (let i = 0; i < retries; i++) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user) return user;
        await new Promise(res => setTimeout(res, delay));

        const { data: sessionData } = await supabase.auth.getSession();
        console.log("🔎 Current Supabase session:", sessionData);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedMethod = localStorage.getItem('selected_payment_method');
    if (savedMethod) {
        document.querySelector('#payment-method .value').textContent = savedMethod.charAt(0).toUpperCase() + savedMethod.slice(1);
    }
    localStorage.removeItem('selected_payment_method');

    const session = await supabase.auth.getSession();
    console.log("🔍 Supabase session on load:", session);
    try {
        console.log('Starting to load checkout data...');
        const user = await getCurrentUserWithRetry();
        console.log('Current user:', user);

        if (!user) {
            throw new Error('No user found. Please log in.');
        }

        // Load cart items
        await loadCartItems(user.id);

        // Load shipping options
        await loadShippingOptions();

        // Load customer info and address
        await loadCustomerInfo(user.id);
        await loadDefaultAddress(user.id);

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Error loading checkout:', error);
        showError(`Error: ${error.message}`);
    }
});

async function loadCartItems(userId) {
    const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('quantity, products(name, price, image_url)')
        .eq('user_id', userId);

    if (cartError) {
        console.error("Failed to load cart items:", cartError.message);
        throw new Error("Unable to load your cart.");
    }

    displayCartItems(cartItems);
    updateTotals(cartItems);
}

function displayCartItems(cartItems) {
    const tableBody = document.querySelector('#checkout-cart-summary tbody');
    tableBody.innerHTML = '';

    if (cartItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                    <p>Your cart is empty</p>
                    <button class="btn-primary" onclick="window.location.href='../updatedShopNow/shop-now.html'">
                        Continue Shopping
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    cartItems.forEach(item => {
        const { name, price, image_url } = item.products;
        const { quantity } = item;
        const itemSubtotal = quantity * price;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${image_url || '/placeholder.png'}" alt="${name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
                    <div>
                        <div style="font-weight: 600; color: #1d1b20;">${name}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight: 600; color: #1d1b20;">₱${price.toFixed(2)}</td>
            <td style="text-align: center; font-weight: 600;">${quantity}</td>
            <td style="font-weight: 700; color: #b3261e;">₱${itemSubtotal.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateTotals(cartItems) {
    const subtotal = cartItems.reduce((sum, item) => {
        return sum + (item.quantity * item.products.price);
    }, 0);

    const shippingCost = shippingOptions.length > 0 ? shippingOptions[0].price : 0;
    const total = subtotal + shippingCost;

    document.getElementById('checkout-subtotal-breakdown').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('checkout-shipping').textContent = `₱${shippingCost.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `₱${total.toFixed(2)}`;
}

async function loadShippingOptions() {
    try {
        const { data, error } = await supabase
            .from('shipping_options')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;

        shippingOptions = data;
        console.log('Shipping options:', shippingOptions);

        if (shippingOptions.length > 0) {
            const selectedShipping = shippingOptions[0];
            updateShippingDisplay(selectedShipping);
            populateShippingOptions();
        }
    } catch (error) {
        console.error('Error loading shipping options:', error);
        showError('Failed to load shipping options');
    }
}

function updateShippingDisplay(shipping) {
    const nameSpan = document.querySelector('#shipping-name .value');
    const priceSpan = document.querySelector('#shipping-price .value');
    const daysSpan = document.querySelector('.delivery-days');

    if (nameSpan) nameSpan.textContent = shipping.name;
    if (priceSpan) priceSpan.textContent = `₱${shipping.price}`;
    if (daysSpan) daysSpan.textContent = shipping.estimated_time;
}

function populateShippingOptions() {
    const shippingList = document.getElementById('shipping-options-list');
    shippingList.innerHTML = '';

    shippingOptions.forEach(option => {
        const li = document.createElement('li');
        li.textContent = `${option.name} - ₱${option.price} (${option.estimated_time})`;
        li.onclick = () => {
            updateShippingDisplay(option);
            document.getElementById('shipping-options-select').style.display = 'none';
            updateTotals(getCurrentCartItems());
        };
        shippingList.appendChild(li);
    });
}

async function loadCustomerInfo(userId) {
    try {
        const { data, error } = await supabase
            .from('customer_info')
            .select('name, mobile_no')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const nameElement = document.getElementById('customer-name');
        const mobileElement = document.getElementById('customer-mobile');

        if (nameElement) nameElement.textContent = data?.name || 'No name provided';
        if (mobileElement) mobileElement.textContent = data?.mobile_no || 'No mobile number provided';
    } catch (error) {
        console.error('Error loading customer info:', error);
    }
}

async function loadDefaultAddress(userId) {
    try {
        const { data, error } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        defaultAddress = data;
        updateAddressDisplay();
    } catch (error) {
        console.error('Error loading default address:', error);
        updateAddressDisplay();
    }
}

function updateAddressDisplay() {
    const addressElement = document.getElementById('address');
    const cityElement = document.getElementById('city');
    const zipElement = document.getElementById('zip');

    if (!defaultAddress) {
        addressElement.textContent = 'No address found';
        cityElement.textContent = 'Please add your address';
        zipElement.textContent = 'in your profile settings';
    } else {
        addressElement.textContent = defaultAddress.address || 'No address set';
        cityElement.textContent = defaultAddress.city || 'No city set';
        zipElement.textContent = defaultAddress.zip_code || 'No zip code set';
    }
}

function setupEventListeners() {
    // Change address button
    const changeAddressBtn = document.querySelector('.change-address-btn');
    if (changeAddressBtn) {
        changeAddressBtn.addEventListener('click', () => {
            const form = document.getElementById('new-address-form');
            form.style.display = form.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Save address button
    const saveAddressBtn = document.getElementById('save-address-btn');
    if (saveAddressBtn) {
        saveAddressBtn.addEventListener('click', saveNewAddress);
    }

    // Change shipping button
    const changeShippingBtn = document.getElementById('change-shipping-btn');
    if (changeShippingBtn) {
        changeShippingBtn.addEventListener('click', () => {
            const optionsDiv = document.getElementById('shipping-options-select');
            optionsDiv.style.display = optionsDiv.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Change payment button
    const changePaymentBtn = document.getElementById('change-payment-btn');
    if (changePaymentBtn) {
        changePaymentBtn.addEventListener('click', () => {
            const mainChoices = document.getElementById('main-payment-choices');
            mainChoices.style.display = mainChoices.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Payment option buttons
    const paymentOptionBtns = document.querySelectorAll('.payment-option-btn');
    paymentOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            updatePaymentMethod(method);
            
            if (method === 'E-Wallet') {
                document.getElementById('e-wallet-options').style.display = 'block';
            } else {
                document.getElementById('e-wallet-options').style.display = 'none';
            }
            
            document.getElementById('main-payment-choices').style.display = 'none';
        });
    });

    // Confirm e-wallet button
    const confirmEwalletBtn = document.getElementById('confirm-ewallet-btn');
    if (confirmEwalletBtn) {
        confirmEwalletBtn.addEventListener('click', confirmEwalletPayment);
    }

    // Place order button
    const placeOrderBtn = document.getElementById('place-order');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
}

async function saveNewAddress() {
    try {
        const user = await getCurrentUser();
        const newAddress = {
            user_id: user.id,
            address: document.getElementById('new-address').value,
            city: document.getElementById('new-city').value,
            zip_code: document.getElementById('new-zip').value,
            is_default: true
        };

        // Validate required fields
        if (!newAddress.address || !newAddress.city || !newAddress.zip_code) {
            showError('Please fill in all address fields');
            return;
        }

        const { data, error } = await supabase
            .from('customer_addresses')
            .insert([newAddress]);

        if (error) throw error;

        showSuccess('New address added successfully!');
        defaultAddress = newAddress;
        updateAddressDisplay();
        document.getElementById('new-address-form').style.display = 'none';
        
        // Clear form
        document.getElementById('new-address').value = '';
        document.getElementById('new-city').value = '';
        document.getElementById('new-zip').value = '';
    } catch (error) {
        console.error("Failed to add address:", error);
        showError("Failed to add address. Please try again.");
    }
}

function updatePaymentMethod(method) {
    const methodDisplay = document.querySelector('#payment-method .value');
    if (methodDisplay) {
        methodDisplay.textContent = method;
    }
}

function confirmEwalletPayment() {
    const selectedMethod = document.querySelector('input[name="e_wallet_method"]:checked');
    if (!selectedMethod) {
        showError('Please select an e-wallet payment method');
        return;
    }

    const methodName = selectedMethod.value;
    updatePaymentMethod(`${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`);
    document.getElementById('e-wallet-options').style.display = 'none';
    showSuccess('Payment method updated successfully!');
}

async function placeOrder() {
    try {
        const user = await getCurrentUser();
        const cartItems = await getCurrentCartItems();
        
        if (cartItems.length === 0) {
            showError('Your cart is empty');
            return;
        }

        if (!defaultAddress) {
            showError('Please add a delivery address');
            return;
        }

        // Show loading state
        const placeOrderBtn = document.getElementById('place-order');
        const originalText = placeOrderBtn.innerHTML;
        placeOrderBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 18V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Processing...
        `;
        placeOrderBtn.disabled = true;

        // Create order
        const orderData = {
            user_id: user.id,
            total_amount: parseFloat(document.getElementById('checkout-total').textContent.replace('₱', '')),
            shipping_address: `${defaultAddress.address}, ${defaultAddress.city} ${defaultAddress.zip_code}`,
            payment_method: document.querySelector('#payment-method .value').textContent,
            status: 'pending',
            message: document.getElementById('message').value || null
        };

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.products.id,
            quantity: item.quantity,
            price: item.products.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Clear cart
        const { error: clearError } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id);

        if (clearError) throw clearError;

        showSuccess('Order placed successfully!');
        
        // Redirect to order confirmation page or homepage
        setTimeout(() => {
            window.location.href = '../Homepage/Homepage.html';
        }, 2000);

    } catch (error) {
        console.error('Error placing order:', error);
        showError('Failed to place order. Please try again.');
        
        // Reset button
        const placeOrderBtn = document.getElementById('place-order');
        placeOrderBtn.innerHTML = originalText;
        placeOrderBtn.disabled = false;
    }
}

async function getCurrentCartItems() {
    const user = await getCurrentUser();
    const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select('quantity, products(name, price, image_url, id)')
        .eq('user_id', user.id);

    if (error) throw error;
    return cartItems || [];
}

function showSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Alef', sans-serif;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Alef', sans-serif;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}