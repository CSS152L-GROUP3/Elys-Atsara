import {
    getCurrentUser,
    fetchShippingOptions,
    fetchDefaultAddress,
    fetchCustomerInfo
} from '../supabaseClient/checkout.js';

import { supabase } from '../supabaseClient/supabase.js';

let shippingOptions = []; // Declare globally
let defaultAddress = null; // ✅ global variable

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

        // ✅ Fetch and display cart items
        const { data: cartItems, error: cartError } = await supabase
            .from('cart_items')
            .select('quantity, products(name, price, image_url)')
            .eq('user_id', user.id);

        if (cartError) {
            console.error("Failed to load cart items:", cartError.message);
            alert("Unable to load your cart.");
            return;
        }

        const tableBody = document.querySelector('#checkout-cart-summary tbody');
        tableBody.innerHTML = '';

        let subtotal = 0;

        cartItems.forEach(item => {
            const { name, price, image_url } = item.products;
            const { quantity } = item;
            const itemSubtotal = quantity * price;
            subtotal += itemSubtotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${image_url || '/placeholder.png'}" alt="${name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" /></td>
                <td>${name}</td>
                <td>₱${price.toFixed(2)}</td>
                <td>${quantity}</td>
                <td><strong>₱${itemSubtotal.toFixed(2)}</strong></td>
            `;
            tableBody.appendChild(row);
        });

        // Populate shipping dropdown
        console.log('Fetching shipping options...');
        shippingOptions = await fetchShippingOptions();
        console.log('Shipping options:', shippingOptions);

        const selectedShipping = shippingOptions[0];
        updateCheckoutTotals(subtotal, parseFloat(selectedShipping.price));
        const { total: initialTotal } = calculateTotals(cartItems, selectedShipping.price);
        const deliveryDays = parseInt(selectedShipping.estimated_time.match(/\d+/)?.[0]);

        console.log("Estimated delivery days:", deliveryDays);

        const nameSpan = document.querySelector('#shipping-name .value');
        const priceSpan = document.querySelector('#shipping-price .value');
        const daysSpan = document.querySelector('.delivery-days');

        if (nameSpan) nameSpan.textContent = selectedShipping.name;
        if (priceSpan) priceSpan.textContent = `₱${selectedShipping.price}`;
        if (daysSpan) daysSpan.textContent = selectedShipping.estimated_time;

        const changeBtn = document.getElementById('change-shipping-btn');
        changeBtn.addEventListener('click', () => {
            const optionsDiv = document.getElementById('shipping-options-select');
            const isVisible = optionsDiv.style.display === 'block';
            optionsDiv.style.display = isVisible ? 'none' : 'block';
        });

        const shippingList = document.getElementById('shipping-options-list');
        const optionsDiv = document.getElementById('shipping-options-select');

        shippingOptions.forEach(option => {
            const li = document.createElement('li');
            li.textContent = `${option.name} - ₱${option.price} (${option.estimated_time})`;
            li.style.cursor = 'pointer';
            li.onclick = () => {
                nameSpan.textContent = option.name;
                priceSpan.textContent = `₱${option.price}`;
                daysSpan.textContent = option.estimated_time;
                optionsDiv.style.display = 'none';

                calculateTotals(cartItems, option.price);
            };

            shippingList.appendChild(li);
        });

        console.log('Fetching customer info...');
        const customerInfo = await fetchCustomerInfo(user.id);
        console.log('Customer info:', customerInfo);

        const nameElement = document.getElementById('customer-name');
        const mobileElement = document.getElementById('customer-mobile');

        if (nameElement) nameElement.textContent = customerInfo.name || 'No name';
        if (mobileElement) mobileElement.textContent = customerInfo.mobile_no || 'No mobile number';

        console.log('Fetching default address...');
        defaultAddress = await fetchDefaultAddress(user.id);
        console.log('Default address:', defaultAddress);

        const addressElement = document.getElementById('address');
        const cityElement = document.getElementById('city');
        const zipElement = document.getElementById('zip');

        if (!addressElement || !cityElement || !zipElement) {
            throw new Error('Address elements not found in the DOM');
        }

        if (!defaultAddress) {
            addressElement.textContent = 'No address found';
            cityElement.textContent = 'Please add your address';
            zipElement.textContent = 'in your profile settings';
        } else {
            addressElement.textContent = defaultAddress.address || 'No address set';
            cityElement.textContent = defaultAddress.city || 'No city set';
            zipElement.textContent = defaultAddress.zip_code || 'No zip code set';
        }

        const changeAddressBtn = document.querySelector('.change-btn');
        if (changeAddressBtn) {
            changeAddressBtn.addEventListener('click', () => {
                const form = document.getElementById('new-address-form');
                form.style.display = form.style.display === 'block' ? 'none' : 'block';
            });
        }

        document.getElementById('save-address-btn').addEventListener('click', async () => {
            const newAddress = {
                user_id: user.id,
                address: document.getElementById('new-address').value,
                city: document.getElementById('new-city').value,
                zip_code: document.getElementById('new-zip').value,
                is_default: true
            };

            const { data, error } = await supabase
                .from('customer_addresses')
                .insert([newAddress]);

            if (error) {
                console.error("Failed to add address:", error.message);
                alert("Failed to add address.");
            } else {
                alert("New address added!");
                document.getElementById('address').textContent = newAddress.address;
                document.getElementById('city').textContent = newAddress.city;
                document.getElementById('zip').textContent = newAddress.zip_code;
                document.getElementById('new-address-form').style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Error loading checkout:', error);
        alert(`Error: ${error.message}`);
    }
});

const methodDisplay = document.querySelector('#payment-method .value');
const changeBtn = document.getElementById('change-payment-btn');
const mainChoices = document.getElementById('main-payment-choices');
const eWalletSection = document.getElementById('e-wallet-options');
const bigOptionBtns = document.querySelectorAll('.big-option-btn');
const confirmEwalletBtn = document.getElementById('confirm-ewallet-btn');

changeBtn.addEventListener('click', () => {
    mainChoices.style.display = 'flex';
    eWalletSection.style.display = 'none';
});

bigOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-method');
        if (selected === 'Cash on Delivery') {
            methodDisplay.textContent = 'Cash on Delivery';
            mainChoices.style.display = 'none';
            eWalletSection.style.display = 'none';
        } else if (selected === 'E-Wallet') {
            eWalletSection.style.display = 'block';
        }
    });
});

function updateCheckoutTotals(subtotal, shipping) {
    const total = subtotal + shipping;

    const subtotalElem = document.getElementById('checkout-subtotal');
    const breakdownElem = document.getElementById('checkout-subtotal-breakdown');
    const shippingElem = document.getElementById('checkout-shipping');
    const totalElem = document.getElementById('checkout-total');

    // ✅ Update both subtotal elements if they exist
    if (subtotalElem) subtotalElem.textContent = `₱${subtotal.toFixed(2)}`;
    if (breakdownElem) breakdownElem.textContent = `₱${subtotal.toFixed(2)}`;
    if (shippingElem) shippingElem.textContent = `₱${shipping.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `₱${total.toFixed(2)}`;
}

function calculateTotals(cartItems, shippingPrice) {
    const subtotal = cartItems.reduce((acc, item) => {
        return acc + item.quantity * item.products.price;
    }, 0);

    const shipping = parseFloat(shippingPrice) || 0;
    const total = subtotal + shipping;

    updateCheckoutTotals(subtotal, shippingPrice);
    return { subtotal, total };
}

confirmEwalletBtn.addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="e_wallet_method"]:checked');
    if (!selectedRadio) {
        alert("Please choose a payment option.");
        return;
    }

    const selectedMethod = selectedRadio.value; // e.g., "gcash", "paymaya", "card", "grab_pay"
    methodDisplay.textContent = selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1);
    mainChoices.style.display = 'none';
    eWalletSection.style.display = 'none';

    try {
        // Fetch cart items again
        const user = await getCurrentUserWithRetry();

        const { data: cartItems, error: cartError } = await supabase
            .from('cart_items')
            .select('quantity, products(name, price)')
            .eq('user_id', user.id); // ✅ now it's attached properly

        if (cartError || !cartItems.length) {
            alert("Unable to load cart.");
            return;
        }

        // Assume shipping is fixed (e.g. 100 PHP) — replace with your logic if dynamic
        const shippingFee = 100;
        const shippingAmount = Math.round(shippingFee * 100);

        const formattedItems = cartItems.map(item => ({
            name: item.products.name,
            quantity: item.quantity,
            amount: Math.round(item.products.price * 100),
            description: item.products.name
        }));

        // ✅ Add shipping as separate line item
        formattedItems.push({
            name: "Shipping Fee",
            quantity: 1,
            amount: shippingAmount,
            description: "Standard Shipping"
        });

        // ✅ Total includes shipping
        const total = formattedItems.reduce((acc, item) => acc + item.amount, 0);

        const response = await fetch("http://localhost:3000/create-paymongo-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: total,
                items: formattedItems,
                payment_method_types: [selectedMethod] // ⬅️ Include chosen method
            })
        });

        localStorage.setItem('selected_payment_method', selectedMethod);

        const data = await response.json();

        if (data.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            alert("Checkout failed.");
            console.error(data);
        }

    } catch (error) {
        console.error("Payment error:", error);
        alert("Something went wrong.");
    }
});

document.getElementById('place-order').addEventListener('click', async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        alert("Please log in to place your order.");
        return;
    }

    const userId = user.id;
    const selectedAddressId = defaultAddress?.id;
    if (!selectedAddressId) {
        alert("Please select a delivery address.");
        return;
    }

    const selectedShippingName = document.querySelector('#shipping-name .value').textContent;
    const selectedShipping = shippingOptions.find(opt => opt.name === selectedShippingName);
    let deliveryDays = parseInt(selectedShipping.estimated_time.match(/\d+/)?.[0]);

    if (isNaN(deliveryDays)) {
        alert("Invalid delivery time format. Please check the shipping option.");
        return;
    }

    const selectedShippingId = selectedShipping.id;
    const shippingPrice = Number(selectedShipping.price);

    deliveryDays = parseInt(selectedShipping.estimated_time);
    if (isNaN(deliveryDays)) {
        alert("Invalid delivery time format. Please check shipping options.");
        return;
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

    const paymentMethod = document.querySelector('#payment-method .value').textContent.trim();

    const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('product_id, quantity, products(price)')
        .eq('user_id', userId);

    const { subtotal, total } = calculateTotals(cartItems, shippingPrice);

    if (cartError || !cartItems.length) {
        alert("Your cart is empty.");
        return;
    }
    const orderItemsJson = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));

    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
            user_id: userId,
            address_id: selectedAddressId,
            shipping_option_id: selectedShippingId,
            payment_method: paymentMethod,
            subtotal_price: subtotal,
            total_price: total,
            delivery_date: estimatedDelivery.toISOString(),
            orders: orderItemsJson
        }])
        .select()
        .single();

    if (orderError) {
        alert("Failed to place order.");
        console.error(orderError);
        return;
    }

    const orderId = newOrder.id;

    const orderItems = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        alert("Order created but failed to save items.");
        console.error(itemsError);
        return;
    }

    const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

    if (clearError) {
        console.warn("Order placed, but failed to clear cart.");
        console.error(clearError);
    } else {
        console.log("✅ Cart cleared.");
    }


    //ITO CODE PARA SA ORDER CONFIRMATION EMAIL    
    // const { data: customer, error: customerError } = await supabase
    // .from('customer_accounts')
    // .select('name, email')
    // .eq('uuid', userId)
    // .single();

    // if (customerError) {
    // console.error("Failed to fetch customer info:", customerError);
    // }

   
    // const orderedProducts = newOrder.orders; 
    // const productIds = orderedProducts.map(item => item.product_id);

   
    // const { data: productsData, error: productError } = await supabase
    // .from('products')
    // .select('id, name')
    // .in('id', productIds);

    // if (productError) {
    // console.error("Failed to fetch product data:", productError);
    // }

   
    // const productNameMap = {};
    // productsData.forEach(product => {
    // productNameMap[product.id] = product.name;
    // });

  
    // const itemSummary = {};
    // orderedProducts.forEach(item => {
    // const name = productNameMap[item.product_id] || 'Item';
    // itemSummary[name] = (itemSummary[name] || 0) + item.quantity;
    // });

    // const itemDescriptions = Object.entries(itemSummary)
    // .map(([name, qty]) => `${qty}x ${name}`)
    // .join(', ');

  
    // try {
    // await emailjs.send("service_z4yifwn", "template_p4t0ftl", {
    //     customer_name: customer?.name || "Customer",
    //     customer_email: customer?.email || "no-reply@example.com",
    //     order_id: newOrder.id,
    //     order_total: `₱${total.toFixed(2)}`,
    //     order_items: itemDescriptions,
      
    // });

    // console.log("Confirmation email sent");
    // } catch (err) {
    // console.error(" Failed to send email:", err);
    // }
    // HANGGANG DITO

    const modal = document.getElementById('order-success-modal');
    const okBtn = document.getElementById('order-success-ok-btn');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    okBtn.onclick = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        window.location.href = '../Homepage/Homepage.html';
    };
});

async function insertOrderItems(orderId, cartItems) {
    const itemsToInsert = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity
    }));

    const { data, error } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

    if (error) {
        console.error("❌ Failed to insert order items:", error);
        alert("Order was created, but we couldn't save the items.");
        return false;
    }

    console.log("✅ Order items inserted:", data);
    return true;
}