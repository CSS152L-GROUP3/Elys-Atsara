import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const cartContainer = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');

  // Step 1: Get logged-in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("You must be logged in to view your cart.");
    return;
  }

  // Step 2: Fetch cart items joined with product details
  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', user.id);

  if (cartError) {
    console.error("Failed to fetch cart:", cartError);
    cartContainer.innerHTML = '<p>Failed to load cart items.</p>';
    return;
  }

  if (cartItems.length === 0) {
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    cartTotal.textContent = 'Total: ₱0.00';
    return;
  }

  // Step 3: Render cart items
  let total = 0;
  cartItems.forEach(item => {
    const product = item.products;
    const subtotal = product.price * item.quantity;
    total += subtotal;

    const itemDiv = document.createElement('div');
    itemDiv.classList.add('cart-item');
    itemDiv.innerHTML = `
      <img src="${product.image_url}" alt="${product.name}" class="cart-item-image" />
      <div class="cart-item-details">
        <h3>${product.name}</h3>
        <p>₱${product.price.toFixed(2)} x ${item.quantity}</p>
        <p><strong>Subtotal:</strong> ₱${subtotal.toFixed(2)}</p>
      </div>
    `;
    cartContainer.appendChild(itemDiv);
  });

  // Step 4: Show total
  cartTotal.textContent = `Total: ₱${total.toFixed(2)}`;
});

// Get cart items for a specific user
export async function getCartItems(userId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching cart items:', error);
    return { data: [], error };
  }
  
  // Transform the data to match the expected format
  const transformedData = data.map(item => ({
    id: item.id,
    quantity: item.quantity,
    price: item.products.price,
    name: item.products.name,
    variation: item.products.variation,
    image_url: item.products.image_url
  }));
  
  return { data: transformedData, error: null };
}

// Update cart item quantity
export async function updateCartItemQuantity(cartItemId, newQuantity) {
  if (newQuantity <= 0) {
    // If quantity is 0 or negative, remove the item
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);
    
    if (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  } else {
    // Update the quantity
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', cartItemId);
    
    if (error) {
      console.error('Error updating cart item quantity:', error);
      throw error;
    }
  }
}

// Clear all cart items for a user
export async function clearCart(userId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
