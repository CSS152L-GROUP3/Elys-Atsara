import { supabase } from '../supabaseClient/supabase.js';

let allOrders = [];

document.addEventListener('DOMContentLoaded', loadOrders);

async function loadOrders() {
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw userErr || new Error('User not logged in');

    const [orders, shipmentLogs] = await Promise.all([
      fetchOrders(user.id),
      fetchShipmentLogs()
    ]);

    allOrders = attachShipperNames(orders, shipmentLogs);
    populateTable(allOrders);

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        const filtered = status === 'all'
          ? allOrders
          : allOrders.filter(o => o.status === status);
        populateTable(filtered);
      });
    });

    const notifBell = document.getElementById('notif-bell');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifBadge = document.getElementById('notif-badge');

    let userId = null;
    // Get current user
    if (user) userId = user.id;

    async function updateNotifBadge() {
      if (!userId) return;
      const { data, error } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('read', false);
      const count = data ? data.length : 0;
      if (count > 0) {
        notifBadge.textContent = count;
        notifBadge.style.display = 'flex';
      } else {
        notifBadge.style.display = 'none';
      }
    }

    if (notifBell && notifDropdown) {
      notifBell.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!notifDropdown.classList.contains('hidden')) {
          notifDropdown.classList.add('hidden');
          return;
        }
        // Fetch unread notifications for this user
        const { data, error } = await supabase
          .from('user_notifications')
          .select('id, type, order_id, message, details, created_at, read')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        notifDropdown.innerHTML = '';
        if (error || !data || data.length === 0) {
          notifDropdown.innerHTML = '<div class="notif-empty">No notifications.</div>';
        } else {
          // Fetch order details for all notifications
          const orderIds = data.map(item => item.order_id);
          let orderDetailsMap = {};
          if (orderIds.length > 0) {
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select('id, payment_method, total_price')
              .in('id', orderIds);
            if (!ordersError && ordersData) {
              ordersData.forEach(order => {
                orderDetailsMap[order.id] = order;
              });
            }
          }
          data.forEach(item => {
            const order = orderDetailsMap[item.order_id] || {};
            notifDropdown.innerHTML += `
              <div class="notif-item${item.read ? '' : ' unread'}" data-notif-id="${item.id}">
                <b>${item.message}</b><br>
                <span style="color:#b3261e; font-size:0.97rem; font-weight:600;">Order ID: ${item.order_id}</span><br>
                ${order.payment_method ? `<span>Payment: <b>${order.payment_method}</b></span>` : ''}
                ${order.total_price !== undefined ? `<span>Total: <b>₱${Number(order.total_price).toFixed(2)}</b></span>` : ''}
                ${item.details ? `<span>Reason: ${item.details}</span><br>` : ''}
                <small style="color:#888;">${new Date(item.created_at).toLocaleString()}</small>
              </div>
            `;
          });
          // Add click listeners to notif items
          notifDropdown.querySelectorAll('.notif-item').forEach(div => {
            div.addEventListener('click', async function() {
              const notifId = this.getAttribute('data-notif-id');
              // Mark as read in DB
              await supabase.from('user_notifications').update({ read: true }).eq('id', notifId);
              // Remove from dropdown
              this.remove();
              // Update badge
              updateNotifBadge();
            });
          });
        }
        notifDropdown.classList.remove('hidden');
      });

      // Hide dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!notifDropdown.classList.contains('hidden')) {
          notifDropdown.classList.add('hidden');
        }
      });
      // Prevent dropdown from closing when clicking inside
      notifDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Initial badge update
    updateNotifBadge();
  } catch (err) {
    console.error('Error loading orders:', err);
    alert('Failed to load orders.');
  }
}

async function fetchOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchShipmentLogs() {
  const { data, error } = await supabase
    .from('shipment_logs')
    .select('order_id, shipper_name');
  if (error) throw error;
  return data || [];
}

function attachShipperNames(orders, logs) {
  const map = new Map(logs.map(l => [l.order_id, l.shipper_name]));
  return orders.map(o => ({ ...o, shipper_name: map.get(o.id) }));
}

function populateTable(orders) {
  const tbody = document.querySelector('.order-table tbody');
  tbody.innerHTML = '';

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7">No orders found.</td></tr>`;
    return;
  }

  orders.forEach(o => {
    const cnt = Array.isArray(o.orders)
      ? o.orders.reduce((s, i) => s + i.quantity, 0)
      : 0;
    const shipperText = (o.status === 'In Transit' && o.shipper_name)
      ? `<br><small>Shipper: ${o.shipper_name}</small>` : '';

    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${o.id}</td>
        <td>${cnt} item(s)</td>
        <td>₱${o.total_price?.toFixed(2)}</td>
        <td>${o.payment_method}</td>
        <td>${new Date(o.created_at).toLocaleString()}</td>
        <td><span class="status ${o.status.toLowerCase().replace(/\s/g, '-')}">${o.status}${shipperText}</span></td>
        <td>
          ${o.status === 'Pending' ? `<button class="cancel-btn" data-id="${o.id}">Cancel</button>` : ''}
          ${o.status === 'Completed' ? `<button class="review-btn" data-order='${JSON.stringify(o)}'>Leave a Review</button>` : ''}
        </td>
      </tr>
    `);
  });

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('.cancel-btn').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id;
      // Show cancel reason modal
      const modal = document.getElementById('cancel-reason-modal');
      const form = document.getElementById('cancel-reason-form');
      form.order_id.value = id;
      // Reset form
      form.reset();
      modal.classList.remove('hidden');
    };
  });

  document.querySelectorAll('.review-btn').forEach(b => {
    b.onclick = () => {
      const order = JSON.parse(b.dataset.order);
      const modal = document.getElementById('review-modal');
      const form = document.getElementById('review-form');
      form.order_id.value = order.id;
      form.product_id.value = order.orders?.[0]?.product_id || '';
      modal.classList.remove('hidden');
    };
  });
}

// Cancel reason modal logic
const cancelModal = document.getElementById('cancel-reason-modal');
const closeCancelModal = document.querySelector('.close-cancel-modal');
if (closeCancelModal) {
  closeCancelModal.onclick = () => cancelModal.classList.add('hidden');
}

document.getElementById('cancel-reason-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const orderId = f.order_id.value;
  let reason = f.reason.value;
  let details = '';
  if (reason === 'Other') {
    details = f.other_reason.value.trim();
    if (!details) details = 'Other';
  }

  // Insert into order_cancellations
  const { error: insertError } = await supabase.from('order_cancellations').insert([
    { order_id: orderId, reason, details }
  ]);
  if (insertError) {
    alert('Failed to record cancellation reason.');
    return;
  }

  // Update order status
  const { error: updateError } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
  if (updateError) {
    alert('Cancel failed');
    return;
  }

  // Fetch order and customer info
  const { data: orderData } = await supabase
    .from('orders')
    .select('id, user_id, orders, total_price')
    .eq('id', orderId)
    .single();

  const { data: customer } = await supabase
    .from('customer_accounts')
    .select('name, email')
    .eq('uuid', orderData.user_id)
    .single();

  // Map product IDs to names
  const productIds = orderData.orders.map(item => item.product_id);
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds);

  const productMap = {};
  productsData.forEach(p => productMap[p.id] = p.name);

  const itemSummary = {};
  orderData.orders.forEach(item => {
    const name = productMap[item.product_id] || "Item";
    itemSummary[name] = (itemSummary[name] || 0) + item.quantity;
  });

  const itemDescriptions = Object.entries(itemSummary)
    .map(([name, qty]) => `${qty}x ${name}`)
    .join(', ');

  try {
    await emailjs.send("service_z4yifwn", "template_vq55ywl", {
      customer_name: customer?.name || "Customer",
      customer_email: customer?.email || "no-reply@example.com",
      order_id: orderData.id,
      order_items: itemDescriptions,
      order_total: `₱${orderData.total_price?.toFixed(2)}`,
      order_status: "Cancelled",
      cancel_reason: `${reason}${details ? ` - ${details}` : ''}`
    });
    console.log("Cancellation email sent.");
  } catch (err) {
    console.error("Failed to send cancellation email:", err);
  }

  cancelModal.classList.add('hidden');
  loadOrders();
};

document.querySelector('.close-modal').onclick = () => {
document.getElementById('review-modal').classList.add('hidden');
};

document.getElementById('review-form').onsubmit = async e => {
  e.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  const f = e.target;
  const review = {
    user_id: user.id,
    order_id: f.order_id.value,
    product_id: f.product_id.value,
    rating: parseInt(f.rating.value),
    comment: f.comment.value
  };
  const { error } = await supabase.from('reviews').insert([review]);
  if (error) alert('Review failed'); else {
    alert('Submitted!');
    document.getElementById('review-modal').classList.add('hidden');
  }
};
