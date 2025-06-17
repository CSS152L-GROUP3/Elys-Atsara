import { supabase } from '../supabaseClient/supabase.js';

async function getCurrentUser() {
  const userType = sessionStorage.getItem('userType');
  if (userType === 'guest') {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

async function updateCartBadgeCount() {
  try {
    const user = await getCurrentUser();
    if (!user) return; // Don't update badge for guest users

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart items:', error);
      return;
    }

    const total = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById('cart-badge');
    
    if (cartBadge) {
      if (total > 0) {
        cartBadge.textContent = total;
        cartBadge.style.display = 'inline-block';
      } else {
        cartBadge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Error updating cart badge:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const productList = document.getElementById('product-list');
  const userType = sessionStorage.getItem('userType');
  const isGuest = userType === 'guest';

  try {
    // Update cart badge count on page load (only for logged-in users)
    if (!isGuest) {
      await updateCartBadgeCount();
    }

    // ✅ 1. Get current user
    const user = await getCurrentUser();

    // ✅ 2. Fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('Error loading products:', productsError);
      productList.innerHTML = '<p>Failed to load products.</p>';
      return;
    }

    // ✅ 3. Fetch user's cart items (only for logged-in users)
    let cartItems = [];
    if (!isGuest && user) {
      const { data: userCartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', user.id);

      if (cartError) {
        console.error('Error loading cart items:', cartError);
        return;
      }
      cartItems = userCartItems;
    }

    console.log('🛒 Cart items from DB:', cartItems);
    console.log("✅ Products loaded:", products);

    // ✅ 4. Render products with quantity from cart (if exists)
    products.forEach(product => {
      const cartItem = cartItems.find(item => item.product_id === product.id);
      const quantity = cartItem ? cartItem.quantity : 0;

      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      productCard.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" class="product-image" />
        <div class="product-info">
          <div class="product-title">${product.name}</div>
          <div class="product-desc">${product.description}</div>
          <div class="product-price">₱${product.price.toFixed(2)}</div>
          <div class="product-variation">Variation: ${product.variation}</div>
          ${isGuest ? 
            '<div class="guest-message" style="color: #B3261E; margin-top: 10px; font-weight: bold;">Please log in to add items to cart</div>' :
            `<div class="counter">
              <button class="minus" data-id="${product.id}">–</button>
              <span class="quantity" data-id="${product.id}">${quantity}</span>
              <button class="plus" data-id="${product.id}">+</button>
            </div>`
          }
        </div>
      `;

      const textElements = productCard.querySelectorAll('.product-title, .product-desc, .product-price, .product-variation, .plus, .minus, .quantity');
      textElements.forEach(el => {
        el.style.fontFamily = "'Alef', sans-serif";
        el.style.color = 'black';
      });

      productList.appendChild(productCard);
    });
  } catch (error) {
    console.error('Error:', error);
    productList.innerHTML = '<p>An error occurred while loading the products.</p>';
  }
});

// Only add click event listener for cart buttons if user is not a guest
const productList = document.getElementById('product-list');
const userType = sessionStorage.getItem('userType');
if (userType !== 'guest') {
  productList.addEventListener('click', async (event) => {
    const isPlus = event.target.classList.contains('plus');
    const isMinus = event.target.classList.contains('minus');

    if (!isPlus && !isMinus) return;

    const productId = event.target.dataset.id;
    const quantityElem = event.target.parentElement.querySelector('.quantity');
    let quantity = parseInt(quantityElem.textContent);

    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userId = user.id;

      // Fetch existing item
      const { data: existingItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId);

      const item = existingItems?.[0];

      if (isPlus) {
        quantity += 1;
        quantityElem.textContent = quantity;

        if (item) {
          // update existing item
          await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', item.id);
        } else {
          // insert new item
          await supabase.from('cart_items').insert({
            user_id: userId,
            product_id: productId,
            quantity: 1,
          });
        }
      }

      if (isMinus) {
        if (quantity === 0) return; // already 0, nothing to do

        quantity -= 1;
        quantityElem.textContent = quantity;

        if (quantity === 0 && item) {
          await supabase
            .from('cart_items')
            .delete()
            .eq('id', item.id);
        } else if (item) {
          await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', item.id);
        }
      }

      // Update cart badge after modifying cart
      await updateCartBadgeCount();

    } catch (err) {
      console.error('🛑 Supabase cart update error:', err);
    }
  });
}



