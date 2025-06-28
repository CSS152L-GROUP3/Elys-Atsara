// import { supabase } from '../supabaseClient/supabase.js';

// async function getCurrentUser() {
//   const userType = sessionStorage.getItem('userType');
//   if (userType === 'guest') {
//     return null;
//   }
//   const { data: { user }, error } = await supabase.auth.getUser();
//   if (error || !user) {
//     return null;
//   }
//   return user;
// }

// async function updateCartBadgeCount() {
//   try {
//     const user = await getCurrentUser();
//     if (!user) return; // Don't update badge for guest users

//     const { data: cartItems, error } = await supabase
//       .from('cart_items')
//       .select('quantity')
//       .eq('user_id', user.id);

//     if (error) {
//       console.error('Error fetching cart items:', error);
//       return;
//     }

//     const total = cartItems.reduce((sum, item) => sum + item.quantity, 0);
//     const cartBadge = document.getElementById('cart-badge');
    
//     if (cartBadge) {
//       if (total > 0) {
//         cartBadge.textContent = total;
//         cartBadge.style.display = 'inline-block';
//       } else {
//         cartBadge.style.display = 'none';
//       }
//     }
//   } catch (err) {
//     console.error('Error updating cart badge:', err);
//   }
// }

// document.addEventListener('DOMContentLoaded', async () => {
//   const productList = document.getElementById('product-list');
//   const userType = sessionStorage.getItem('userType');
//   const isGuest = userType === 'guest';

//   try {
//     // Update cart badge count on page load (only for logged-in users)
//     if (!isGuest) {
//       await updateCartBadgeCount();
//     }

//     // ✅ 1. Get current user
//     const user = await getCurrentUser();

//     // ✅ 2. Fetch products
//     const { data: products, error: productsError } = await supabase
//       .from('products')
//       .select('*');

//     if (productsError) {
//       console.error('Error loading products:', productsError);
//       productList.innerHTML = '<p>Failed to load products.</p>';
//       return;
//     }

//     // ✅ 3. Fetch user's cart items (only for logged-in users)
//     let cartItems = [];
//     if (!isGuest && user) {
//       const { data: userCartItems, error: cartError } = await supabase
//         .from('cart_items')
//         .select('product_id, quantity')
//         .eq('user_id', user.id);

//       if (cartError) {
//         console.error('Error loading cart items:', cartError);
//         return;
//       }
//       cartItems = userCartItems;
//     }

//     console.log('🛒 Cart items from DB:', cartItems);
//     console.log("✅ Products loaded:", products);

//     // ✅ 4. Render products with quantity from cart (if exists)
//     products.forEach(product => {
//       const cartItem = cartItems.find(item => item.product_id === product.id);
//       const quantity = cartItem ? cartItem.quantity : 0;

//       const productCard = document.createElement('div');
//       productCard.className = 'product-card';

//       productCard.innerHTML = `
//         <img src="${product.image_url}" alt="${product.name}" class="product-image" />
//         <div class="product-info">
//           <div class="product-title">${product.name}</div>
//           <div class="product-desc">${product.description}</div>
//           <div class="product-price">₱${product.price.toFixed(2)}</div>
//           <div class="product-variation">Variation: ${product.variation}</div>
//           ${isGuest ? 
//             '<div class="guest-message" style="color: #B3261E; margin-top: 10px; font-weight: bold;">Please log in to add items to cart</div>' :
//             `<div class="counter">
//               <button class="minus" data-id="${product.id}">–</button>
//               <span class="quantity" data-id="${product.id}">${quantity}</span>
//               <button class="plus" data-id="${product.id}">+</button>
//             </div>`
//           }
//         </div>
//       `;

//       const textElements = productCard.querySelectorAll('.product-title, .product-desc, .product-price, .product-variation, .plus, .minus, .quantity');
//       textElements.forEach(el => {
//         el.style.fontFamily = "'Alef', sans-serif";
//         el.style.color = 'black';
//       });

//       productList.appendChild(productCard);
//     });
//   } catch (error) {
//     console.error('Error:', error);
//     productList.innerHTML = '<p>An error occurred while loading the products.</p>';
//   }
// });

// // Only add click event listener for cart buttons if user is not a guest
// const productList = document.getElementById('product-list');
// const userType = sessionStorage.getItem('userType');
// if (userType !== 'guest') {
//   productList.addEventListener('click', async (event) => {
//     const isPlus = event.target.classList.contains('plus');
//     const isMinus = event.target.classList.contains('minus');

//     if (!isPlus && !isMinus) return;

//     const productId = event.target.dataset.id;
//     const quantityElem = event.target.parentElement.querySelector('.quantity');
//     let quantity = parseInt(quantityElem.textContent);

//     try {
//       const user = await getCurrentUser();
//       if (!user) return;

//       const userId = user.id;

//       // Fetch existing item
//       const { data: existingItems, error } = await supabase
//         .from('cart_items')
//         .select('*')
//         .eq('user_id', userId)
//         .eq('product_id', productId);

//       const item = existingItems?.[0];

//       if (isPlus) {
//         quantity += 1;
//         quantityElem.textContent = quantity;

//         if (item) {
//           // update existing item
//           await supabase
//             .from('cart_items')
//             .update({ quantity })
//             .eq('id', item.id);
//         } else {
//           // insert new item
//           await supabase.from('cart_items').insert({
//             user_id: userId,
//             product_id: productId,
//             quantity: 1,
//           });
//         }
//       }

//       if (isMinus) {
//         if (quantity === 0) return; // already 0, nothing to do

//         quantity -= 1;
//         quantityElem.textContent = quantity;

//         if (quantity === 0 && item) {
//           await supabase
//             .from('cart_items')
//             .delete()
//             .eq('id', item.id);
//         } else if (item) {
//           await supabase
//             .from('cart_items')
//             .update({ quantity })
//             .eq('id', item.id);
//         }
//       }

//       // Update cart badge after modifying cart
//       await updateCartBadgeCount();

//     } catch (err) {
//       console.error('🛑 Supabase cart update error:', err);
//     }
//   });

// document.addEventListener('DOMContentLoaded', () => {
//   const cartIconBtn = document.getElementById('cart-icon-btn');
//   const cartTextBtn = document.getElementById('cart-text-btn');

//   function goToCartPage() {
//     const role = sessionStorage.getItem('userType');

//     if (role === 'admin') {
//       window.location.href = '../adminCart/admin-cart.html';
//     } else if (role === 'customer') {
//       window.location.href = '../updatedCartPage/Cartpage.html';
//     } else if (role === 'guest' || !role) {
//       alert('Please log in to view your cart.');
//       window.location.href = '../accountLogin/account-login.html'; 
//     } else {
//       alert('User role not recognized.');
//     }
//   }

//   cartIconBtn?.addEventListener('click', goToCartPage);
//   cartTextBtn?.addEventListener('click', goToCartPage);
// });

  

// console.log('Detected user role:', userType);

// }



import { supabase } from '../supabaseClient/supabase.js';

async function getCurrentUserWithRole() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.warn('No session or session error:', sessionError);
    return { user: null, role: 'guest' };
  }

  const user = session.user;
  const uuid = user.id;

  const { data: adminData } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (adminData) {
    return { user, role: 'admin' };
  }

  const { data: customerData } = await supabase
    .from('customer_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (customerData) {
    return { user, role: 'customer' };
  }

  return { user: null, role: 'guest' };
}

async function updateCartBadgeCount(user) {
  try {
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
      cartBadge.textContent = total;
      cartBadge.style.display = total > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.error('Error updating cart badge:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const productList = document.getElementById('product-list');
  const { user, role } = await getCurrentUserWithRole();

  console.log(' Detected user role:', role);

  if (role !== 'guest') {
    await updateCartBadgeCount(user);
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*');

  if (productsError) {
    console.error('Error loading products:', productsError);
    productList.innerHTML = '<p>Failed to load products.</p>';
    return;
  }

  let cartItems = [];
  if (role !== 'guest' && user) {
    const { data: userCartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('user_id', user.id);

    if (cartError) {
      console.error('Error loading cart items:', cartError);
    } else {
      cartItems = userCartItems;
    }
  }

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
        ${role === 'guest' ?
          '<div class="guest-message" style="color: #B3261E; margin-top: 10px; font-weight: bold;">Please log in to add items to cart</div>' :
          `<div class="counter">
            <button class="minus" data-id="${product.id}">–</button>
            <span class="quantity" data-id="${product.id}">${quantity}</span>
            <button class="plus" data-id="${product.id}">+</button>
          </div>`}
      </div>
    `;

    productList.appendChild(productCard);
  });

  if (role !== 'guest') {
    productList.addEventListener('click', async (event) => {
      const isPlus = event.target.classList.contains('plus');
      const isMinus = event.target.classList.contains('minus');

      if (!isPlus && !isMinus) return;

      const productId = event.target.dataset.id;
      const quantityElem = event.target.parentElement.querySelector('.quantity');
      let quantity = parseInt(quantityElem.textContent);

      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      const item = existingItems?.[0];

      if (isPlus) {
        quantity += 1;
        quantityElem.textContent = quantity;
        if (item) {
          await supabase.from('cart_items').update({ quantity }).eq('id', item.id);
        } else {
          await supabase.from('cart_items').insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });
        }
      }

      if (isMinus) {
        if (quantity === 0) return;
        quantity -= 1;
        quantityElem.textContent = quantity;

        if (quantity === 0 && item) {
          await supabase.from('cart_items').delete().eq('id', item.id);
        } else if (item) {
          await supabase.from('cart_items').update({ quantity }).eq('id', item.id);
        }
      }

      await updateCartBadgeCount(user);
    });
  }

  const cartIconBtn = document.getElementById('cart-icon-btn');
  const cartTextBtn = document.getElementById('cart-text-btn');

  function goToCartPage() {
    if (role === 'admin') {
      window.location.href = '../adminCart/admin-cart.html';
    } else if (role === 'customer') {
      window.location.href = '../updatedCartPage/Cartpage.html';
    } else {
      alert('Please log in to view your cart.');
      window.location.href = '../accountLogin/account-login.html';
    }
  }

  cartIconBtn?.addEventListener('click', goToCartPage);
  cartTextBtn?.addEventListener('click', goToCartPage);
});

document.addEventListener("DOMContentLoaded", async () => {
  const { user, role } = await getCurrentUserWithRole();
  console.log("Detected user role:", role);

  const dashboardBtn1 = document.querySelector(".DashBtn1");
  const dashboardBtn2 = document.querySelector(".DashBtn2");
  const cartIconBtn = document.querySelector(".CartBtn1");
  const cartTextBtn = document.querySelector(".CartBtn2");

  // Show/hide buttons based on role
  if (role === "guest") {
    dashboardBtn1?.classList.add("hidden");
    dashboardBtn2?.classList.add("hidden");
    cartIconBtn?.classList.remove("hidden");
    cartTextBtn?.classList.remove("hidden");
  } else if (role === "admin") {
    dashboardBtn1?.classList.remove("hidden");
    dashboardBtn2?.classList.remove("hidden");
    cartIconBtn?.classList.add("hidden");
    cartTextBtn?.classList.add("hidden");
  } else if (role === "customer") {
    dashboardBtn1?.classList.add("hidden");
    dashboardBtn2?.classList.add("hidden");
    cartIconBtn?.classList.remove("hidden");
    cartTextBtn?.classList.remove("hidden");
  }

  // Cart button functionality
  cartIconBtn?.addEventListener("click", () => {
    if (role === "customer") {
      window.location.href = "../updatedCartPage/Cartpage.html";
    } else {
      alert("Please log in to view your cart.");
      window.location.href = "../accountLogin/account-login.html";
    }
  });

  cartTextBtn?.addEventListener("click", () => {
    if (role === "customer") {
      window.location.href = "../updatedCartPage/Cartpage.html";
    } else {
      alert("Please log in to view your cart.");
      window.location.href = "../accountLogin/account-login.html";
    }
  });

  // Dashboard button functionality
  dashboardBtn1?.addEventListener("click", () => {
    if (role === "admin") {
      window.location.href = "../adminDashboard/admin-dashboard.html";
    }
  });

  dashboardBtn2?.addEventListener("click", () => {
    if (role === "admin") {
      window.location.href = "../adminDashboard/admin-dashboard.html";
    }
  });
});

