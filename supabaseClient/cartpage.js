import { supabase } from './supabase.js';
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function loadCartItems() {
  const user = await getCurrentUser();
  if (!user) {
    document.querySelector('.rectangle').innerHTML = '<p>Please log in to view your cart.</p>';
    return;
  }

  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('id, quantity, product_id')
    .eq('user_id', user.id);

  if (cartError) {
    console.error('❌ Error fetching cart items:', cartError);
    return;
  }

  let subtotal = 0;

  const container = document.querySelector('.rectangle');
  container.innerHTML = ''; 

  for (const item of cartItems) {
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('name, price, variation, image_url')
      .eq('id', item.product_id)
      .single();

    if (productError) {
      console.error('❌ Error fetching product data:', productError);
      continue;
    }

    const totalPrice = productData.price * item.quantity;
    subtotal += totalPrice;

    const itemHTML = `
      <div class="cart-item">
        <img src="${productData.image_url}" alt="${productData.name}" style="width: 100px; height: 100px; object-fit: cover;" />
        <div class="details">
          <div><strong>${productData.name}</strong></div>
          <div>Size: ${productData.variation}</div>
          <div>Price: ₱${productData.price.toFixed(2)}</div>
          <div>Quantity: ${item.quantity}</div>
          <div>Total: ₱${totalPrice.toFixed(2)}</div>
          <button onclick="removeCartItem(${item.id})">Remove</button>
        </div>
      </div>
      <hr />
    `;

    container.insertAdjacentHTML('beforeend', itemHTML);
  }

  // Set subtotal
  const subtotalEl = document.querySelector('.supporting-text-21');
  if (subtotalEl) subtotalEl.textContent = `Subtotal: ₱${subtotal.toFixed(2)}`;
}

window.removeCartItem = async function(cartItemId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);

  if (error) {
    console.error('❌ Error removing item:', error);
  } else {
    loadCartItems(); 
  }
}

document.addEventListener('DOMContentLoaded', loadCartItems);