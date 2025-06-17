// cart-page.js
import { supabase } from './supabase.js';
import { getCartItems, updateCartItemQuantity } from './cart.js';

async function updateCartDisplay() {
  const cartContainer = document.getElementById('cart-items');
  const user = await supabase.auth.getUser();
  const userId = user.data?.user?.id;

  if (!userId) {
    cartContainer.innerHTML = '<p>Please log in to view your cart.</p>';
    return;
  }

  const { data: cartItems, error } = await getCartItems(userId);

  if (error) {
    cartContainer.innerHTML = '<p>Error loading cart items.</p>';
    console.error(error);
    return;
  }

  if (cartItems.length === 0) {
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }

  let totalAmount = 0;
  cartContainer.innerHTML = `
    <div class="cart-header">
      <div class="cart-item-image"></div>
      <div class="cart-item-name">Product</div>
      <div class="cart-item-price">Price</div>
      <div class="cart-item-quantity">Quantity</div>
      <div class="cart-item-subtotal">Subtotal</div>
    </div>
  `;

  cartItems.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalAmount += itemTotal;

    const itemElement = document.createElement('div');
    itemElement.classList.add('cart-item-row');

    itemElement.innerHTML = `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.image_url}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name} (${item.variation})</div>
          <div class="cart-item-price">₱${item.price.toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="quantity-btn minus" data-id="${item.id}">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn plus" data-id="${item.id}">+</button>
          </div>
          <div class="cart-item-subtotal">₱${itemTotal.toFixed(2)}</div>
        </div>
      </div>
    `;

    // Add event listeners for quantity buttons
    const minusBtn = itemElement.querySelector('.minus');
    const plusBtn = itemElement.querySelector('.plus');
    const quantitySpan = itemElement.querySelector('.quantity');

    minusBtn.addEventListener('click', async () => {
      const newQuantity = item.quantity - 1;
      await updateCartItemQuantity(item.id, newQuantity);
      await updateCartDisplay();
    });

    plusBtn.addEventListener('click', async () => {
      const newQuantity = item.quantity + 1;
      await updateCartItemQuantity(item.id, newQuantity);
      await updateCartDisplay();
    });

    cartContainer.appendChild(itemElement);
  });

  // Add total amount display next to checkout button
  const totalElement = document.createElement('div');
  totalElement.classList.add('cart-total');
  totalElement.innerHTML = `<span>Total Amount: ₱${totalAmount.toFixed(2)}</span>`;
  document.querySelector('.overlap-group-2').insertBefore(totalElement, document.querySelector('.supporting-text-24'));
}

document.addEventListener('DOMContentLoaded', updateCartDisplay);
