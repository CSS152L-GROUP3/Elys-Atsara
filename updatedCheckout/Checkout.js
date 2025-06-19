// import {
//     getCurrentUser,
//     fetchShippingOptions,
//     fetchDefaultAddress,
//     fetchCustomerInfo

// } from '../supabaseClient/checkout.js';

// import { supabase } from '../supabaseClient/supabase.js';

// let shippingOptions = []; // Declare globally
// let defaultAddress = null; // ✅ global variable


// document.addEventListener('DOMContentLoaded', async () => {
//     try {
//         console.log('Starting to load checkout data...');
//         const user = await getCurrentUser();
//         console.log('Current user:', user);

//         if (!user) {
//             throw new Error('No user found. Please log in.');
//         }

//         // ✅ Fetch and display cart items
//         const { data: cartItems, error: cartError } = await supabase
//             .from('cart_items')
//             .select('quantity, products(name, price, image_url)')
//             .eq('user_id', user.id);

//         if (cartError) {
//             console.error("Failed to load cart items:", cartError.message);
//             alert("Unable to load your cart.");
//             return;
//         }

//         const tableBody = document.querySelector('#checkout-cart-summary tbody');
//         tableBody.innerHTML = '';

//         let subtotal = 0;

//         cartItems.forEach(item => {
//             const { name, price, image_url } = item.products;
//             const { quantity } = item;
//             const itemSubtotal = quantity * price;
//             subtotal += itemSubtotal;

//             const row = document.createElement('tr');
//             row.innerHTML = `
//         <td><img src="${image_url || '/placeholder.png'}" alt="${name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" /></td>
//         <td>${name}</td>
//         <td>₱${price.toFixed(2)}</td>
//         <td>${quantity}</td>
//         <td><strong>₱${itemSubtotal.toFixed(2)}</strong></td>
//     `;
//             tableBody.appendChild(row);
//         });

//         document.getElementById('checkout-subtotal').textContent = `₱${subtotal.toFixed(2)}`;




//         // Populate shipping dropdown
//         console.log('Fetching shipping options...');
//         shippingOptions = await fetchShippingOptions(); // Assign to global
//         console.log('Shipping options:', shippingOptions);

//         // Pick the first shipping method by default
//         const selectedShipping = shippingOptions[0];
//         const deliveryDays = parseInt(selectedShipping.estimated_time.match(/\d+/)?.[0]); // <-- FIXED

//         console.log("Estimated delivery days:", deliveryDays);


//         const nameSpan = document.querySelector('#shipping-name .value');
//         const priceSpan = document.querySelector('#shipping-price .value');
//         const daysSpan = document.querySelector('.delivery-days');

//         if (nameSpan) nameSpan.textContent = selectedShipping.name;
//         if (priceSpan) priceSpan.textContent = `₱${selectedShipping.price}`;
//         if (daysSpan) daysSpan.textContent = selectedShipping.estimated_time;

//         const changeBtn = document.getElementById('change-shipping-btn');
//         changeBtn.addEventListener('click', () => {
//             const optionsDiv = document.getElementById('shipping-options-select');
//             const isVisible = optionsDiv.style.display === 'block';
//             optionsDiv.style.display = isVisible ? 'none' : 'block';
//         });

//         const shippingList = document.getElementById('shipping-options-list');
//         const optionsDiv = document.getElementById('shipping-options-select'); // Needed for li.onclick

//         shippingOptions.forEach(option => {
//             const li = document.createElement('li');
//             li.textContent = `${option.name} - ₱${option.price} (${option.estimated_time})`;
//             li.style.cursor = 'pointer';
//             li.onclick = () => {
//                 nameSpan.textContent = option.name;
//                 priceSpan.textContent = `₱${option.price}`;
//                 daysSpan.textContent = option.estimated_time;
//                 optionsDiv.style.display = 'none';
//             };
//             shippingList.appendChild(li);
//         });


//         // Fetch customer name & mobile
//         console.log('Fetching customer info...');
//         const customerInfo = await fetchCustomerInfo(user.id);
//         console.log('Customer info:', customerInfo);

//         const nameElement = document.getElementById('customer-name');
//         const mobileElement = document.getElementById('customer-mobile');

//         if (nameElement) nameElement.textContent = customerInfo.name || 'No name';
//         if (mobileElement) mobileElement.textContent = customerInfo.mobile_no || 'No mobile number';

//         // Populate address fields
//         console.log('Fetching default address...');
//         defaultAddress = await fetchDefaultAddress(user.id);
//         console.log('Default address:', address);

//         const addressElement = document.getElementById('address');
//         const cityElement = document.getElementById('city');
//         const zipElement = document.getElementById('zip');

//         if (!addressElement || !cityElement || !zipElement) {
//             throw new Error('Address elements not found in the DOM');
//         }

//         // After fetching address
//         if (!defaultAddress) {
//             addressElement.textContent = 'No address found';
//             cityElement.textContent = 'Please add your address';
//             zipElement.textContent = 'in your profile settings';
//         } else {
//             addressElement.textContent = defaultAddress.address || 'No address set';
//             cityElement.textContent = defaultAddress.city || 'No city set';
//             zipElement.textContent = defaultAddress.zip_code || 'No zip code set';
//         }


//         // ✅ Always attach "Change Address" button click
//         const changeAddressBtn = document.querySelector('.change-btn');
//         if (changeAddressBtn) {
//             changeAddressBtn.addEventListener('click', () => {
//                 const form = document.getElementById('new-address-form');
//                 form.style.display = form.style.display === 'block' ? 'none' : 'block';
//             });
//         }

//         // ADD THIS near the end of your DOMContentLoaded function
//         document.getElementById('save-address-btn').addEventListener('click', async () => {
//             const user = await getCurrentUser();

//             const newAddress = {
//                 user_id: user.id,
//                 address: document.getElementById('new-address').value,
//                 city: document.getElementById('new-city').value,
//                 zip_code: document.getElementById('new-zip').value,
//                 is_default: true
//             };

//             const { data, error } = await supabase
//                 .from('customer_addresses')
//                 .insert([newAddress]);

//             if (error) {
//                 console.error("Failed to add address:", error.message);
//                 alert("Failed to add address.");
//             } else {
//                 alert("New address added!");
//                 // Update address display
//                 document.getElementById('address').textContent = newAddress.address;
//                 document.getElementById('city').textContent = newAddress.city;
//                 document.getElementById('zip').textContent = newAddress.zip_code;

//                 // Hide form
//                 document.getElementById('new-address-form').style.display = 'none';
//             }
//         });


//     } catch (error) {
//         console.error('Error loading checkout:', error);
//         alert(`Error: ${error.message}`);
//     }


// });


// const methodDisplay = document.querySelector('#payment-method .value');
// const changeBtn = document.getElementById('change-payment-btn');
// const mainChoices = document.getElementById('main-payment-choices');
// const eWalletSection = document.getElementById('e-wallet-options');
// const bigOptionBtns = document.querySelectorAll('.big-option-btn');
// const confirmEwalletBtn = document.getElementById('confirm-ewallet-btn');

// // Show main choices when clicking change
// changeBtn.addEventListener('click', () => {
//     mainChoices.style.display = 'flex';
//     eWalletSection.style.display = 'none'; // hide e-wallet if open
// });

// // When clicking "Cash on Delivery" or "E-Wallet"
// bigOptionBtns.forEach(btn => {
//     btn.addEventListener('click', () => {
//         const selected = btn.getAttribute('data-method');
//         if (selected === 'Cash on Delivery') {
//             methodDisplay.textContent = 'Cash on Delivery';
//             mainChoices.style.display = 'none';
//             eWalletSection.style.display = 'none'; // hide e-wallet options
//         } else if (selected === 'E-Wallet') {
//             // Show e-wallet options section
//             eWalletSection.style.display = 'block';
//         }
//     });
// });

// // Confirm e-wallet method
// confirmEwalletBtn.addEventListener('click', () => {
//     const selectedRadio = document.querySelector('input[name="e_wallet_method"]:checked');
//     if (!selectedRadio) {
//         alert("Please choose a payment option.");
//         return;
//     }
//     methodDisplay.textContent = selectedRadio.value;
//     mainChoices.style.display = 'none';
//     eWalletSection.style.display = 'none';
// });


// //Place Order

// document.getElementById('place-order').addEventListener('click', async () => {
//     // ✅ 1. Get current user
//     const { data: { user }, error: userError } = await supabase.auth.getUser();
//     if (userError || !user) {
//         alert("Please log in to place your order.");
//         return;
//     }

//     const userId = user.id;

//     // ✅ 2. Get selected address ID
//     const selectedAddressId = defaultAddress?.id; // ✅ use globally saved address
//     if (!selectedAddressId) {
//         alert("Please select a delivery address.");
//         return;
//     }

//     // ✅ 3. Get selected shipping option ID
//     const selectedShippingName = document.querySelector('#shipping-name .value').textContent;
//     const selectedShipping = shippingOptions.find(opt => opt.name === selectedShippingName);
//     // Try to extract a number from the estimated_time string (like "2-5 days" or "3 days")
//     let deliveryDays = parseInt(selectedShipping.estimated_time.match(/\d+/)?.[0]);

//     if (isNaN(deliveryDays)) {
//         alert("Invalid delivery time format. Please check the shipping option.");
//         return;
//     }


//     const selectedShippingId = selectedShipping.id;
//     const shippingPrice = Number(selectedShipping.price);

//     // Convert delivery time to a number (assume it's like "3 days" or "2-5 days")
//     deliveryDays = parseInt(selectedShipping.estimated_time);


//     if (isNaN(deliveryDays)) {
//         alert("Invalid delivery time format. Please check shipping options.");
//         return;
//     }

//     const estimatedDelivery = new Date();
//     estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);


//     // ✅ 4. Get selected payment method
//     const paymentMethod = document.querySelector('#payment-method .value').textContent.trim();

//     // ✅ 5. Get cart items
//     const { data: cartItems, error: cartError } = await supabase
//         .from('cart_items')
//         .select('product_id, quantity, products(price)')
//         .eq('user_id', userId);

//     const subtotal = cartItems.reduce((acc, item) => {
//         return acc + item.quantity * item.products.price;
//     }, 0);


//     if (cartError || !cartItems.length) {
//         alert("Your cart is empty.");
//         return;
//     }


//     // ✅ 6. Calculate totals
//     // ✅ After computing all values
//     const total = subtotal + shippingPrice;

//     document.getElementById('checkout-subtotal-breakdown').textContent = `₱${subtotal.toFixed(2)}`;
//     document.getElementById('checkout-shipping').textContent = `₱${shippingPrice.toFixed(2)}`;
//     document.getElementById('checkout-total').textContent = `₱${total.toFixed(2)}`;


//     console.log({
//         userId,
//         selectedAddressId,
//         selectedShippingId,
//         paymentMethod,
//         subtotal,
//         total,
//         deliveryDate: estimatedDelivery.toISOString()
//     });

//     console.log("Trying to insert order with values:");
//     console.log({
//         user_id: userId,
//         address_id: selectedAddressId,
//         shipping_option_id: selectedShippingId,
//         payment_method: paymentMethod,
//         subtotal_price: subtotal,
//         total_price: total,
//         delivery_date: estimatedDelivery.toISOString(),
//     });


//     // ✅ 7. Insert into orders table
//     const { data: newOrder, error: orderError } = await supabase
//         .from('orders')
//         .insert([{

//             user_id: userId,
//             address_id: selectedAddressId,
//             shipping_option_id: selectedShippingId,
//             payment_method: paymentMethod,
//             subtotal_price: subtotal,
//             total_price: total,
//             delivery_date: estimatedDelivery.toISOString(),
//         }])
//         .select()
//         .single();


//     if (orderError) {
//         alert("Failed to place order.");
//         console.error(orderError);
//         return;
//     }

//     const orderId = newOrder.id;

//     // ✅ 8. Insert each product into order_items table
//     const orderItems = cartItems.map(item => ({
//         order_id: orderId,
//         product_id: item.product_id,
//         quantity: item.quantity
//     }));

//     const { error: itemsError } = await supabase
//         .from('order_items')
//         .insert(orderItems);

//     if (itemsError) {
//         alert("Order created but failed to save items.");
//         console.error(itemsError);
//         return;
//     }

//     // ✅ All good! Now clear the cart
//     const { error: clearError } = await supabase
//         .from('cart_items')
//         .delete()
//         .eq('user_id', userId);

//     if (clearError) {
//         console.warn("Order placed, but failed to clear cart.");
//         console.error(clearError);
//     } else {
//         console.log("✅ Cart cleared.");
//     }

//     // ✅ Done!
//     alert("🎉 Order placed successfully!");
//     window.location.href = "/order-confirmation.html";
// });

// async function insertOrderItems(orderId, cartItems) {
//     const itemsToInsert = cartItems.map(item => ({
//         order_id: orderId,
//         product_id: item.product_id,
//         quantity: item.quantity
//     }));

//     const { data, error } = await supabase
//         .from('order_items')
//         .insert(itemsToInsert);

//     if (error) {
//         console.error("❌ Failed to insert order items:", error);
//         alert("Order was created, but we couldn't save the items.");
//         return false;
//     }

//     console.log("✅ Order items inserted:", data);
//     return true;
// }


import {
    getCurrentUser,
    fetchShippingOptions,
    fetchDefaultAddress,
    fetchCustomerInfo
} from '../supabaseClient/checkout.js';

import { supabase } from '../supabaseClient/supabase.js';

let shippingOptions = []; // Declare globally
let defaultAddress = null; // ✅ global variable

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Starting to load checkout data...');
        const user = await getCurrentUser();
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
            const user = await getCurrentUser();

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
        const { data: cartItems, error: cartError } = await supabase
            .from('cart_items')
            .select('quantity, products(name, price)')
            .eq('user_id', (await supabase.auth.getUser()).data.user.id);

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

    total = subtotal + shippingPrice;

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

    alert("🎉 Order placed successfully!");
    window.location.href = "/order-confirmation.html";
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