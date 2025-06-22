// cart-page.js
import { supabase } from '../supabaseClient/supabase.js';
import { getCartItems, updateCartItemQuantity, clearCart } from '../supabaseClient/cart.js';

async function updateCartDisplay() {
  const cartContainer = document.getElementById('cart-items');
  const cartTotalContainer = document.getElementById('cart-total');
  const user = await supabase.auth.getUser();
  const userId = user.data?.user?.id;
  
  if (!userId) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <h3>Please Log In</h3>
        <p>You need to be logged in to view your cart.</p>
        <button class="btn-primary" onclick="window.location.href='../accountLogin/account-login.html'">
          Log In
        </button>
      </div>
    `;
    cartTotalContainer.innerHTML = '';
    return;
  }

  const { data: cartItems, error } = await getCartItems(userId);

  if (error) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <h3>Error Loading Cart</h3>
        <p>There was an error loading your cart items. Please try again.</p>
      </div>
    `;
    cartTotalContainer.innerHTML = '';
    console.error(error);
    return;
  }

  if (cartItems.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <h3>Your Cart is Empty</h3>
        <p>Looks like you haven't added any items to your cart yet.</p>
        <button class="btn-primary" onclick="window.location.href='../updatedShopNow/shop-now.html'">
          Start Shopping
        </button>
      </div>
    `;
    cartTotalContainer.innerHTML = '';
    return;
  }

  let totalAmount = 0;
  
  // Create cart header
  cartContainer.innerHTML = `
    <div class="cart-header">
      <div>Product</div>
      <div>Price</div>
      <div>Quantity</div>
      <div>Subtotal</div>
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
          <img src="${item.image_url}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80?text=Product'">
          <div class="cart-item-name">${item.name} (${item.variation})</div>
        </div>
        <div class="cart-item-price">₱${item.price.toFixed(2)}</div>
        <div class="cart-item-quantity">
          <button class="quantity-btn minus" data-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn plus" data-id="${item.id}">+</button>
        </div>
        <div class="cart-item-subtotal">₱${itemTotal.toFixed(2)}</div>
      </div>
    `;

    // Add event listeners for quantity buttons
    const minusBtn = itemElement.querySelector('.minus');
    const plusBtn = itemElement.querySelector('.plus');

    minusBtn.addEventListener('click', async () => {
      if (item.quantity > 1) {
        const newQuantity = item.quantity - 1;
        await updateCartItemQuantity(item.id, newQuantity);
        await updateCartDisplay();
      }
    });

    plusBtn.addEventListener('click', async () => {
      const newQuantity = item.quantity + 1;
      await updateCartItemQuantity(item.id, newQuantity);
      await updateCartDisplay();
    });

    cartContainer.appendChild(itemElement);
  });

  // Update total display
  cartTotalContainer.innerHTML = `
    <span>Total: ₱${totalAmount.toFixed(2)}</span>
  `;

  // Update cart badge
  const cartBadge = document.getElementById('cart-badge');
  if (cartBadge) {
    cartBadge.textContent = cartItems.length;
  }
}

// Clear cart functionality
async function handleClearCart() {
  const user = await supabase.auth.getUser();
  const userId = user.data?.user?.id;
  
  if (!userId) {
    alert('Please log in to clear your cart.');
    return;
  }

  if (confirm('Are you sure you want to clear your cart? This action cannot be undone.')) {
    try {
      await clearCart(userId);
      await updateCartDisplay();
      alert('Cart cleared successfully!');
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Error clearing cart. Please try again.');
    }
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  updateCartDisplay();

  const clearCartBtn = document.getElementById('clear-cart-btn');
  const confirmModal = document.getElementById('custom-confirm-modal');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const user = await supabase.auth.getUser();
      const userId = user.data?.user?.id;
      
      if (!userId) return;

      const { data: cartItems } = await getCartItems(userId);
      if (cartItems.length === 0) return;

      confirmModal.style.display = 'flex';
      setTimeout(() => {
        confirmModal.classList.add('visible');
      }, 10);
    });
  }

  function hideModal() {
    confirmModal.classList.remove('visible');
    setTimeout(() => {
      confirmModal.style.display = 'none';
    }, 300);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const user = await supabase.auth.getUser();
      const userId = user.data?.user?.id;
      if (userId) {
        await clearCart(userId);
        await updateCartDisplay();
      }
      hideModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal();
    });
  }

  // Also hide modal if overlay is clicked
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        hideModal();
      }
    });
  }
});

// Export for potential use in other modules
export { updateCartDisplay };
