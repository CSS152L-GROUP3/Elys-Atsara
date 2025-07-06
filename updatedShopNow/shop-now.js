import { supabase } from "../supabaseClient/supabase.js";

async function getCurrentUserWithRole() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.warn("No session or session error:", sessionError);
    return { user: null, role: "guest" };
  }

  const user = session.user;
  const uuid = user.id;

  const { data: adminData } = await supabase
    .from("admin_accounts")
    .select("*")
    .eq("uuid", uuid)
    .maybeSingle();

  if (adminData) {
    return { user, role: "admin" };
  }

  const { data: customerData } = await supabase
    .from("customer_accounts")
    .select("*")
    .eq("uuid", uuid)
    .maybeSingle();

  if (customerData) {
    return { user, role: "customer" };
  }

  return { user: null, role: "guest" };
}

async function updateCartBadgeCount(user) {
  try {
    const { data: cartItems, error } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching cart items:", error);
      return;
    }

    const total = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.getElementById("cart-badge");

    if (cartBadge) {
      cartBadge.textContent = total;
      cartBadge.style.display = total > 0 ? "inline-block" : "none";
    }
  } catch (err) {
    console.error("Error updating cart badge:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const productList = document.getElementById("product-list");
  const { user, role } = await getCurrentUserWithRole();

  console.log("Detected user role:", role);

  if (role !== "guest") {
    await updateCartBadgeCount(user);
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*");

  if (productsError) {
    console.error("Error loading products:", productsError);
    productList.innerHTML = "<p>Failed to load products.</p>";
    return;
  }

  products.sort((a, b) => a.variation.localeCompare(b.variation)); 

  let cartItems = [];
  if (role !== "guest" && user) {
    const { data: userCartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", user.id);

    if (cartError) {
      console.error("Error loading cart items:", cartError);
    } else {
      cartItems = userCartItems;
    }
  }

  products.forEach((product) => {
    const cartItem = cartItems.find((item) => item.product_id === product.id);
    const quantity = cartItem ? cartItem.quantity : 0;

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.innerHTML = `
      <img src="${product.image_url}" alt="${
      product.name
    }" class="product-image" />
      <div class="product-info">
        <div class="product-title">${product.name}</div>
        <div class="product-desc">${product.description}</div>
        <div class="product-price">₱${product.price.toFixed(2)}</div>
        <div class="product-variation">Variation: ${product.variation}</div>
        <div class="product-stock">Stock: ${product.stock_quantity}</div>
        ${
          role === "guest"
            ? '<div class="guest-message" style="color: #B3261E; margin-top: 10px; font-weight: bold;">Please log in to add items to cart</div>'
            : `<div class="counter">
            <button class="minus" data-id="${product.id}">–</button>
            <span class="quantity" data-id="${product.id}">${quantity}</span>
            <button class="plus" data-id="${product.id}" data-stock="${product.stock_quantity}">+</button>
          </div>`
        }
      </div>
    `;

    productList.appendChild(productCard);
  });

  if (role !== "guest") {
    productList.addEventListener("click", async (event) => {
      const isPlus = event.target.classList.contains("plus");
      const isMinus = event.target.classList.contains("minus");

      if (!isPlus && !isMinus) return;

      const productId = event.target.dataset.id;
      const quantityElem =
        event.target.parentElement.querySelector(".quantity");
      const stockElem = event.target.closest(".product-info").querySelector(".product-stock");
      let quantity = parseInt(quantityElem.textContent);
      const maxStock = parseInt(event.target.dataset.stock) || 0;

      // const { data: existingItems } = await supabase
      //   .from("cart_items")
      //   .select("*")
      //   .eq("user_id", user.id)
      //   .eq("product_id", productId);

      // const item = existingItems?.[0];

      // // Fetch latest stock from the database
      // const { data: productData, error: stockError } = await supabase
      //   .from("products")
      //   .select("stock_quantity")
      //   .eq("id", productId)
      //   .maybeSingle();

      // if (stockError || !productData) {
      //   alert("Error retrieving product stock.");
      //   return;
      // }

      // let currentStock = productData.stock_quantity;

      // if (isPlus) {
      //   if (quantity >= currentStock) {
      //     return;
      //   }
  const { data: existingItems } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", productId);

  const item = existingItems?.[0];

  // Fetch latest stock from the database
  const { data: productData, error: stockError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .maybeSingle();

  if (stockError || !productData) {
    alert("Error retrieving product stock.");
    return;
  }

  let currentStock = productData.stock_quantity;
  
if (isPlus) {
  const maxStock = parseInt(
    event.target.dataset.stock
  );

  if (quantity >= maxStock) {
    alert("Cannot add more than available stock.");
    return;
  }

  quantity += 1;
  quantityElem.textContent = quantity;

  const newDisplayStock = maxStock - quantity;
  stockElem.textContent = `Stock: ${newDisplayStock}`;

  if (item) {
    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", item.id);
  } else {
    await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
    });
  }
}

if (isMinus) {
  if (quantity === 0) return;

  quantity -= 1;
  quantityElem.textContent = quantity;

  const maxStockFromPlus = parseInt(
    event.target.parentElement.querySelector(".plus").dataset.stock
  );

  const newDisplayStock = maxStockFromPlus - quantity;
  stockElem.textContent = `Stock: ${newDisplayStock}`;

  if (quantity === 0 && item) {
    await supabase.from("cart_items").delete().eq("id", item.id);
  } else if (item) {
    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", item.id);
  }
}


await updateCartBadgeCount(user);

});

        quantity += 1;
        currentStock -= 1;
        quantityElem.textContent = quantity;
        stockElem.textContent = `Stock: ${currentStock}`;

        await supabase
          .from("products")
          .update({ stock_quantity: currentStock })
          .eq("id", productId);

        if (item) {
          await supabase
            .from("cart_items")
            .update({ quantity })
            .eq("id", item.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1,
          });
        }
      }

      if (isMinus) {
        if (quantity === 0) return;

        quantity -= 1;
        currentStock += 1;
        quantityElem.textContent = quantity;
        stockElem.textContent = `Stock: ${currentStock}`;

        await supabase
          .from("products")
          .update({ stock_quantity: currentStock })
          .eq("id", productId);

        if (quantity === 0 && item) {
          await supabase.from("cart_items").delete().eq("id", item.id);
        } else if (item) {
          await supabase
            .from("cart_items")
            .update({ quantity })
            .eq("id", item.id);
        }
      }

      await updateCartBadgeCount(user);
    });
  

  const cartIconBtn = document.getElementById("cart-icon-btn");
  const cartTextBtn = document.getElementById("cart-text-btn");

  function goToCartPage() {
    if (role === "admin") {
      window.location.href = "../adminCart/admin-cart.html";
    } else if (role === "customer") {
      window.location.href = "../updatedCartPage/Cartpage.html";
    } else {
      alert("Please log in to view your cart.");
      window.location.href = "../accountLogin/account-login.html";
    }
  }

  cartIconBtn?.addEventListener("click", goToCartPage);
  cartTextBtn?.addEventListener("click", goToCartPage);

document.addEventListener("DOMContentLoaded", async () => {
  const { user, role } = await getCurrentUserWithRole();
  console.log("Detected user role:", role);

  const dashboardBtn1 = document.querySelector(".DashBtn1");
  const dashboardBtn2 = document.querySelector(".DashBtn2");
  const cartIconBtn = document.querySelector(".CartBtn1");
  const cartTextBtn = document.querySelector(".CartBtn2");

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

  dashboardBtn1?.addEventListener("click", () => {
    if (role === "admin") {
      window.location.href = "../AdminDashboard/Dashboard.html";
    }
  });

  dashboardBtn2?.addEventListener("click", () => {
    if (role === "admin") {
      window.location.href = "../AdminDashboard/Dashboard.html";
    }
  });
});

// Out of Stock Modal Logic (non-intrusive)
document.addEventListener('DOMContentLoaded', function() {
  const outOfStockModal = document.getElementById('out-of-stock-modal');
  const closeOutOfStockBtn = document.getElementById('close-out-of-stock');

  document.body.addEventListener('click', function(e) {
    // Only handle plus button clicks
    if (e.target.classList.contains('plus')) {
      const stock = parseInt(e.target.getAttribute('data-stock'));
      if (stock === 0) {
        e.preventDefault();
        if (outOfStockModal) outOfStockModal.style.display = 'flex';
        return;
      }
    }
    // Close modal if overlay or close button is clicked
    if (
      (e.target === outOfStockModal) ||
      (e.target && e.target.id === 'close-out-of-stock')
    ) {
      if (outOfStockModal) outOfStockModal.style.display = 'none';
    }
  });
});

