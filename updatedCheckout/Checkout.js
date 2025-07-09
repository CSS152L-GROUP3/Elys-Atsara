import {
    getCurrentUser,
    fetchDefaultAddress,
    fetchCustomerInfo
} from '../supabaseClient/checkout.js';

import { supabase } from '../supabaseClient/supabase.js';

let shippingOptions = []; // Declare globally
let defaultAddress = null; // ✅ global variable
let shippingFee = 0;
let deliveryDays = 2; // fallback value
let selectedShippingOptionId = null; // For storing selected shipping option


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
    // --- Debug: Log Supabase session info in localStorage ---
    for (let key in localStorage) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            console.log('🔑 Supabase session key:', key, localStorage.getItem(key));
        }
    }

    // --- Robust session restoration and user check ---
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('Supabase session fetch error:', sessionError);
        }
        if (!session) {
            alert('Session expired or missing. Please log in again.');
            window.location.href = '../accountLogin/account-login.html'; // Change to your login page if needed
            return;
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error('Supabase user fetch error:', userError);
        }
        if (!user) {
            alert('User not found. Please log in again.');
            window.location.href = '../accountLogin/account-login.html';
            return;
        }
        console.log('✅ Session and user found:', { session, user });
    } catch (err) {
        console.error('Error during session/user check:', err);
        alert('Unexpected error. Please log in again.');
        window.location.href = '/accountlogin/account-login.html';
        return;
    }

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

        subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.products.price, 0);
        updateCheckoutTotals(subtotal, shippingFee);



        const nameSpan = document.querySelector('#shipping-name .value');
        const priceSpan = document.querySelector('#shipping-price .value');
        const daysSpan = document.querySelector('.delivery-days');

        if (nameSpan) nameSpan.textContent = "Pickup (in-store)";
        if (priceSpan) priceSpan.textContent = `₱${shippingFee.toFixed(2)}`;
        if (daysSpan) daysSpan.textContent = `${deliveryDays} day(s)`;

        console.log('Fetching customer info...');
        const customerInfo = await fetchCustomerInfo(user.id);


        const nameElement = document.getElementById('customer-name');
        const mobileElement = document.getElementById('customer-mobile');

        if (nameElement) nameElement.textContent = customerInfo.name || 'No name';
        if (mobileElement) mobileElement.textContent = customerInfo.mobile_no || 'No mobile number';

        console.log('Fetching default address...');
        // 1. Get Cart Subtotal
        subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.products.price, 0);

        // 2. Fetch default address (this might later affect shippingFee)
        defaultAddress = await fetchDefaultAddress(user.id);

        // ✅ Fetch and Display Shipping Options
        const { data: shippingOptionsData, error: shippingOptionsError } = await supabase
            .from('shipping_options')
            .select('*');

        // Debug logging
        console.log('Fetched shipping options:', shippingOptionsData);
        console.log('Fetch error:', shippingOptionsError);

        if (shippingOptionsError) {
            console.error("❌ Failed to fetch shipping options:", shippingOptionsError.message);
            alert("Failed to load shipping methods.");
            return;
        }

        shippingOptions = shippingOptionsData;

        // ✅ Get stored shipping option or fallback to Pick-up
        const storedOptionId = localStorage.getItem('selectedShippingOptionId');
        let selectedOption = shippingOptions.find(opt => opt.id == storedOptionId);

        if (!selectedOption) {
            selectedOption = shippingOptions.find(opt => opt.name === 'Pickup (in-store)');
            if (selectedOption) {
                localStorage.setItem('selectedShippingOptionId', selectedOption.id);
            } else {
                alert("No available shipping options. Please contact support.");
                throw new Error("No available shipping options.");
            }
        }

        selectedShippingOptionId = selectedOption.id;

        // ✅ Set base fee and perKmRate
        let baseFee = 0;
        let perKmRate = 0;

        if (selectedOption.name === 'LBC Express') {
            baseFee = 60;
            perKmRate = 12;
        } else if (selectedOption.name === 'J&T Express') {
            baseFee = 40;
            perKmRate = 8;
        }

        try {
            const customerCoords = {
                lat: defaultAddress.latitude,
                lon: defaultAddress.longitude
            };

            const response = await fetch('http://localhost:3000/calculate-distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: { lat: 14.5547, lon: 121.0244 },
                    to: customerCoords
                })
            });

            const result = await response.json();
            const distance_km = result.distance_km;

            if (distance_km <= 5) {
                deliveryDays = 1;
            } else if (distance_km <= 20) {
                deliveryDays = 2;
            } else if (distance_km <= 50) {
                deliveryDays = 3;
            } else if (distance_km <= 100) {
                deliveryDays = 4;
            } else if (distance_km <= 200) {
                deliveryDays = 5;
            } else {
                deliveryDays = 6; // max cap
            }

            if (selectedOption.name === 'Pick-up') {
                shippingFee = 0;
            } else {
                let maxRateKm = 100;
                let discountedRate = perKmRate * 0.5;

                let distanceCharge =
                    distance_km <= maxRateKm
                        ? perKmRate * distance_km
                        : (perKmRate * maxRateKm) + ((distance_km - maxRateKm) * discountedRate);

                shippingFee = baseFee + distanceCharge;
            }

        } catch (err) {
            console.error("❌ Distance calc failed:", err);
            shippingFee = 100;
            deliveryDays = 3;
        }

        // ✅ Update UI
        document.querySelector('#shipping-name .value').textContent = selectedOption.name;
        document.querySelector('#shipping-price .value').textContent = `₱${shippingFee.toFixed(2)}`;
        document.querySelector('.delivery-days').textContent = `${deliveryDays} day(s)`;


        // Render shipping options in the UI
        const list = document.getElementById('shipping-options-list');
        if (list) {
            list.innerHTML = '';

            shippingOptions.forEach(option => {
                const li = document.createElement('li');
                li.textContent = option.name;
                li.classList.add('shipping-option-item');
                li.style.cursor = 'pointer';
                li.dataset.optionId = option.id;
                li.dataset.optionName = option.name;
                list.appendChild(li);
            });
        }

        const sellerCoords = { lat: 14.5547, lon: 121.0244 };
        const customerCoords = {
            lat: defaultAddress?.latitude,
            lon: defaultAddress?.longitude
        };

        console.log("📍 Coordinates:", { from: sellerCoords, to: customerCoords });

        // ✅ Now update checkout totals with final shippingFee
        updateCheckoutTotals(subtotal, shippingFee);

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

        // ✅ Toggle the Select Menu
        const changeShippingBtn = document.getElementById('change-shipping-btn');
        if (changeShippingBtn) {
            changeShippingBtn.addEventListener('click', () => {
                const dropdown = document.getElementById('shipping-options-select');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // ✅ Handle Selection + Dynamic Calculation
        const shippingOptionsList = document.getElementById('shipping-options-list');
        if (shippingOptionsList) {
            shippingOptionsList.addEventListener('click', async (e) => {
                if (!e.target.matches('.shipping-option-item')) return;

                const selectedOptionId = e.target.dataset.optionId;
                const selectedOptionName = e.target.dataset.optionName;

                let baseFee = 0;
                let perKmRate = 0;

                if (selectedOptionName === 'LBC Express') {
                    baseFee = 60;
                    perKmRate = 12;
                } else if (selectedOptionName === 'J&T Express') {
                    baseFee = 40;
                    perKmRate = 8;
                }

                try {
                    const customerCoords = {
                        lat: defaultAddress.latitude,
                        lon: defaultAddress.longitude
                    };

                    const response = await fetch('http://localhost:3000/calculate-distance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: { lat: 14.5547, lon: 121.0244 },
                            to: customerCoords
                        })
                    });

                    const result = await response.json();
                    const distance_km = result.distance_km;

                    // 📦 Calculate delivery days for all methods
                    if (distance_km <= 5) {
                        deliveryDays = 1;
                    } else if (distance_km <= 20) {
                        deliveryDays = 2;
                    } else if (distance_km <= 50) {
                        deliveryDays = 3;
                    } else if (distance_km <= 100) {
                        deliveryDays = 4;
                    } else if (distance_km <= 200) {
                        deliveryDays = 5;
                    } else {
                        deliveryDays = 6; // max cap
                    }

                    // 📦 Pick-up is free
                    if (selectedOptionName === 'Pick-up') {
                        shippingFee = 0;
                    } else {
                        let maxRateKm = 100;
                        let discountedRate = perKmRate * 0.5;

                        let distanceCharge =
                            distance_km <= maxRateKm
                                ? perKmRate * distance_km
                                : (perKmRate * maxRateKm) + ((distance_km - maxRateKm) * discountedRate);

                        shippingFee = baseFee + distanceCharge;
                    }

                } catch (err) {
                    console.error("❌ Distance calculation failed:", err);
                    shippingFee = 100;
                    deliveryDays = 3;
                }

                // ✅ Update UI
                document.querySelector('#shipping-name .value').textContent = selectedOptionName;
                document.querySelector('#shipping-price .value').textContent = `₱${shippingFee.toFixed(2)}`;
                document.querySelector('.delivery-days').textContent = `${deliveryDays} day(s)`;

                // ✅ Store selection
                selectedShippingOptionId = selectedOptionId;
                localStorage.setItem('selectedShippingOptionId', selectedOptionId);

                // ✅ Update total
                updateCheckoutTotals(subtotal, shippingFee);

                // ✅ Hide dropdown
                const dropdown = document.getElementById('shipping-options-select');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        }


        console.log("👤 User ID:", user.id);
        console.log("📦 Address Input:", address, city, zip);

        // ✅ Save Address with Geocoding
        document.getElementById('save-address-btn').addEventListener('click', async () => {
            console.log('Save address button clicked');

            const address = document.getElementById('new-address').value.trim();
            const city = document.getElementById('new-city').value.trim();
            const zip = document.getElementById('new-zip').value.trim();

            if (!address || !city || !zip) {
                alert("Please complete the address fields.");
                return;
            }

            const fullAddress = `${address}, ${city}, ${zip}`;
            let coords;

            try {
                coords = await geocodeAddress(fullAddress);
                console.log("📍 Geocoded coords:", coords);

                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) throw new Error("User not found");

                // ✅ Check if this address already exists for the user
                const { data: matches, error: existingError } = await supabase
                    .from('customer_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('address', address)
                    .eq('city', city)
                    .eq('zip_code', zip)
                    .limit(1);

                if (existingError) {
                    console.error("❌ Supabase error when checking address:", existingError);
                    alert("Something went wrong when checking address.");
                    return;
                }

                const existing = matches && matches.length > 0 ? matches[0] : null;



                if (existing) {
                    // ✅ Update that existing address and set as default
                    const { error: updateError } = await supabase
                        .from('customer_addresses')
                        .update({
                            is_default: true,
                            latitude: coords.latitude,
                            longitude: coords.longitude
                        })
                        .eq('id', existing.id);

                    if (updateError) {
                        console.error("❌ Failed to update address:", updateError);
                        alert("Failed to update address.");
                        return;
                    }

                    // ✅ Unset others
                    await supabase
                        .from('customer_addresses')
                        .update({ is_default: false })
                        .eq('user_id', user.id)
                        .neq('id', existing.id);

                    console.log("✅ Address updated as default");
                } else {
                    // ✅ Unset previous defaults first
                    await supabase
                        .from('customer_addresses')
                        .update({ is_default: false })
                        .eq('user_id', user.id)
                        .eq('is_default', true);

                    // ✅ Insert new address
                    const { error: insertError } = await supabase
                        .from('customer_addresses')
                        .insert([{
                            user_id: user.id,
                            address,
                            city,
                            zip_code: zip,
                            is_default: true,
                            latitude: coords.latitude,
                            longitude: coords.longitude
                        }]);

                    if (insertError) {
                        console.error("❌ Failed to insert address:", insertError);
                        alert("Failed to insert address.");
                        return;
                    }

                    console.log("✅ New address inserted and set as default");
                }

                // ✅ Fetch new default and update UI
                defaultAddress = await fetchDefaultAddress(user.id);
                document.getElementById('address').textContent = defaultAddress.address;
                document.getElementById('city').textContent = defaultAddress.city;
                document.getElementById('zip').textContent = defaultAddress.zip_code;
                document.getElementById('new-address-form').style.display = 'none';

                // ✅ Refresh shipping
                await recalculateShipping();

                alert("✅ Address saved and applied!");
                location.reload();

            } catch (err) {
                console.error("❌ Address saving failed:", err);
                alert("Failed to save address.");
            }
        });



        async function recalculateShipping() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) throw new Error("User not found");

                // ⏬ Always refetch the latest default address
                defaultAddress = await fetchDefaultAddress(user.id);
                if (!defaultAddress || !defaultAddress.latitude || !defaultAddress.longitude) {
                    throw new Error("Missing or invalid coordinates for address.");
                }

                const sellerCoords = { lat: 14.5547, lon: 121.0244 }; // Makati
                const customerCoords = {
                    lat: defaultAddress.latitude,
                    lon: defaultAddress.longitude
                };

                const response = await fetch('http://localhost:3000/calculate-distance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ from: sellerCoords, to: customerCoords })
                });

                const result = await response.json();
                if (!response.ok || result.distance_km === undefined) {
                    throw new Error(result.error || "Invalid response from ORS.");
                }

                const distance_km = result.distance_km;

                // Use selected shipping option pricing if available
                if (selectedShippingOptionId) {
                    const selectedOption = shippingOptions.find(opt => opt.id == selectedShippingOptionId);
                    if (selectedOption) {
                        let baseFee = 50;
                        let perKmRate = 10;

                        if (selectedOption.name === 'LBC Express') {
                            baseFee = 60;
                            perKmRate = 12;
                        } else if (selectedOption.name === 'J&T Express') {
                            baseFee = 40;
                            perKmRate = 8;
                        } else if (selectedOption.name === 'Pick-up') {
                            shippingFee = 0;
                            deliveryDays = 0;
                        }

                        if (selectedOption.name !== 'Pick-up') {
                            let maxRateKm = 100;
                            let discountedRate = perKmRate * 0.5;

                            let distanceCharge =
                                distance_km <= maxRateKm
                                    ? perKmRate * distance_km
                                    : (perKmRate * maxRateKm) + ((distance_km - maxRateKm) * discountedRate);

                            shippingFee = baseFee + distanceCharge;
                            if (distance_km <= 5) {
                                deliveryDays = 1;
                            } else if (distance_km <= 20) {
                                deliveryDays = 2;
                            } else if (distance_km <= 50) {
                                deliveryDays = 3;
                            } else if (distance_km <= 100) {
                                deliveryDays = 4;
                            } else if (distance_km <= 200) {
                                deliveryDays = 5;
                            } else {
                                deliveryDays = 6; // max cap
                            }
                        }
                    } else {
                        // Fallback to pick-up (free)
                        shippingFee = 0;
                        deliveryDays = 0;
                    }
                } else {
                    // Default to pick-up (free) if no option selected
                    shippingFee = 0;
                    deliveryDays = 0;
                }

                // ✅ Update shipping info in DOM
                const selectedOption = shippingOptions.find(opt => opt.id == selectedShippingOptionId);
                const shippingName = selectedOption ? selectedOption.name : "Pick-up";
                document.querySelector('#shipping-name .value').textContent = shippingName;
                document.querySelector('#shipping-price .value').textContent = `₱${shippingFee.toFixed(2)}`;
                document.querySelector('.delivery-days').textContent = `${deliveryDays} day(s)`;

                // ✅ Recalculate subtotal and total
                const { data: cartItems } = await supabase
                    .from('cart_items')
                    .select('quantity, products(price)')
                    .eq('user_id', user.id);

                const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.products.price, 0);
                updateCheckoutTotals(subtotal, shippingFee);

                // ✅ Update address display
                document.getElementById('address').textContent = defaultAddress.address || 'No address';
                document.getElementById('city').textContent = defaultAddress.city || 'No city';
                document.getElementById('zip').textContent = defaultAddress.zip_code || 'No zip';

                console.log("📦 Shipping recalculated:", {
                    shippingFee,
                    deliveryDays,
                    distance_km: distance_km.toFixed(2),
                    selectedOption: selectedOption?.name || 'Default'
                });
            } catch (err) {
                console.error("❌ Failed to recalculate shipping:", err);
                alert("Shipping calculation failed. Please check your address.");
                shippingFee = 0;
                deliveryDays = 0;
                updateCheckoutTotals(0, shippingFee); // Fallback to pick-up
            }
        }


    } catch (error) {
        console.error('Error loading checkout:', error);
        alert(`Error: ${error.message}`);
    }
});


async function geocodeAddress(fullAddress) {
    const apiKey = 'YOUR_OPENCAGE_API_KEY'; // Replace with your real key
    const encodedAddress = encodeURIComponent(fullAddress);

    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${'1d3b7d2cf3ec4c03b40581da61813a6f'}`);

    if (!response.ok) {
        throw new Error("Failed to geocode address");
    }

    const data = await response.json();
    if (data.results.length === 0) {
        throw new Error("No location found for the address.");
    }

    const { lat, lng } = data.results[0].geometry;
    return { latitude: lat, longitude: lng };
}



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
            description: `Shipping (ETA: ${deliveryDays} day${deliveryDays > 1 ? 's' : ''})`
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

    const shippingPrice = shippingFee;
    const selectedShippingId = selectedShippingOptionId;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

    const paymentMethod = document.querySelector('#payment-method .value').textContent.trim();

    const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('product_id, quantity, products(price)')
        .eq('user_id', userId);

    if (cartError || !cartItems.length) {
        return;
    }

    const { subtotal, total } = calculateTotals(cartItems, shippingPrice);

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
            shipping_fee: shippingFee,
            delivery_days: deliveryDays,
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

    for (const item of cartItems) {
        const { data: productData, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .maybeSingle();

        if (fetchError || !productData || typeof productData.stock_quantity !== 'number') {
            console.error(`Failed to fetch stock for product ${item.product_id}`);
            continue;
        }

        const newStock = productData.stock_quantity - item.quantity;

        const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.product_id);

        if (updateError) {
            console.error(`Failed to update stock for product ${item.product_id}:`, updateError);
        }
    }

    const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

    if (clearError) {
        console.warn("Order placed, but failed to clear cart.");
        console.error(clearError);
    }

    localStorage.removeItem('selectedShippingOptionId');

    try {
        const { data: customer, error: customerError } = await supabase
            .from('customer_accounts')
            .select('name, email')
            .eq('uuid', userId)
            .single();

        if (customerError) {
            console.error("Failed to fetch customer info:", customerError);
        }

        const orderedProducts = newOrder.orders;
        const productIds = orderedProducts.map(item => item.product_id);

        const { data: productsData, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);

        if (productError) {
            console.error("Failed to fetch product data:", productError);
        }

        const productNameMap = {};
        productsData.forEach(product => {
            productNameMap[product.id] = product.name;
        });

        const itemSummary = {};
        orderedProducts.forEach(item => {
            const name = productNameMap[item.product_id] || 'Item';
            itemSummary[name] = (itemSummary[name] || 0) + item.quantity;
        });

        const itemDescriptions = Object.entries(itemSummary)
            .map(([name, qty]) => `${qty}x ${name}`)
            .join(', ');

        await emailjs.send("service_z4yifwn", "template_p4t0ftl", {
            customer_name: customer?.name || "Customer",
            customer_email: customer?.email || "no-reply@example.com",
            order_id: newOrder.id,
            order_total: `₱${total.toFixed(2)}`,
            order_items: itemDescriptions
        });

        console.log("Confirmation email sent");
    } catch (err) {
        console.error(" Failed to send email:", err);
    }


    // ✅ Success modal
    const modal = document.getElementById('order-success-modal');
    const okBtn = document.getElementById('order-success-ok-btn');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    okBtn.onclick = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        window.location.href = '../index.html';
    };
}); // ← only one closing brace here


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
