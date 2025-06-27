import { supabase } from '../supabaseClient/supabase.js';

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Always hide the modal on page load
  const modal = document.getElementById('cancel-reason-modal-admin');
  if (modal) modal.classList.add('hidden');

  // Notification Bell Dropdown
  const notifBell = document.getElementById('notif-bell');
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifBell && notifDropdown) {
    notifBell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!notifDropdown.classList.contains('hidden')) {
        notifDropdown.classList.add('hidden');
        return;
      }
      // Fetch recent unread cancellations (limit 10)
      const { data, error } = await supabase
        .from('order_cancellations')
        .select('order_id, reason, details, created_at, read')
        .order('created_at', { ascending: false })
        .limit(10);
      notifDropdown.innerHTML = '';
      if (error || !data || data.length === 0) {
        notifDropdown.innerHTML = '<div class="notif-empty">No recent notifications.</div>';
      } else {
        data.forEach(item => {
          notifDropdown.innerHTML += `
            <div class="notif-item${item.read ? '' : ' unread'}">
              <b>Order:</b> ${item.order_id}<br>
              <b>Reason:</b> ${item.reason || 'N/A'}<br>
              <small style="color:#888;">${new Date(item.created_at).toLocaleString()}</small>
            </div>
          `;
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

  try {
    const [orders, customers, shipmentLogs, userResult] = await Promise.all([
      fetchOrders(),
      fetchCustomers(),
      fetchShipmentLogs(),
      supabase.auth.getUser()
    ]);

    if (userResult.error) throw userResult.error;

    const adminEmail = userResult.data.user?.email || 'unknown';
    allOrders = attachCustomerAndShipperNames(orders, customers, shipmentLogs);
    populateOrdersTable(allOrders, adminEmail);
    setupFilterDropdowns(adminEmail);
    updateNotifBadge();
  } catch (error) {
    console.error('Error loading admin cart data:', error.message || error);
    alert('Failed to load orders. Check console for more info.');
  }
});

async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customer_accounts')
    .select('uuid, name');

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

function attachCustomerAndShipperNames(orders, customers, shipmentLogs) {
  const customerMap = new Map();
  customers.forEach(c => customerMap.set(c.uuid, c.name));

  const shipperMap = new Map();
  shipmentLogs.forEach(log => {
    if (!shipperMap.has(log.order_id)) {
      shipperMap.set(log.order_id, log.shipper_name);
    }
  });

  return orders.map(order => ({
    ...order,
    customer_name: customerMap.get(order.user_id) || 'Unknown',
    shipper_name: shipperMap.get(order.id) || ''
  }));
}

function populateOrdersTable(orders, adminEmail) {
  const tableBody = document.querySelector('.order-table tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!orders.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7">No orders found.</td>';
    tableBody.appendChild(row);
    return;
  }

  orders.forEach(order => {
    const itemCount = Array.isArray(order.orders)
      ? order.orders.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    let actionsHTML = '';
    if (order.status === 'Pending') {
      actionsHTML = `
        <button class="action-btn ship">Ship</button>
        <button class="action-btn cancel" style="background-color: #e74c3c; color: white;">Cancel</button>
      `;
    } else if (order.status === 'In Transit') {
      actionsHTML = `
        <button class="action-btn complete" style="background-color: #2ecc71; color: white;">Complete</button>
        <button class="action-btn cancel" style="background-color: #e74c3c; color: white;">Cancel</button>
      `;
    } else if (order.status === 'Cancelled') {
      actionsHTML = `
        <button class="action-btn view-reason" data-order-id="${order.id}" style="background-color: #b3261e; color: #fff;">View Reason</button>
      `;
    }

    const shipperInfo = order.status === 'In Transit'
      ? `<br><small>Shipper: ${order.shipper_name || 'Unknown'}</small>`
      : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer_name}</td>
      <td>${itemCount} item(s)</td>
      <td>₱${order.total_price?.toFixed(2)}</td>
      <td>${order.payment_method}</td>
      <td>
        <span class="status ${order.status?.toLowerCase().replace(/\s/g, '-')}">
          ${order.status}${shipperInfo}
        </span>
      </td>
      <td>
        <div class="actions-container">
          ${actionsHTML}
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  addActionListeners(adminEmail);

  // Add view reason listeners
  document.querySelectorAll('.view-reason').forEach(btn => {
    btn.addEventListener('click', async e => {
      const orderId = btn.getAttribute('data-order-id');
      const { data, error } = await supabase
        .from('order_cancellations')
        .select('id, reason, details, created_at, read')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const modal = document.getElementById('cancel-reason-modal-admin');
      const content = document.getElementById('cancel-reason-content-admin');
      if (error || !data) {
        content.innerHTML = '<span style="color:#b3261e;">No reason found for this cancellation.</span>';
      } else {
        content.innerHTML = `<b>Reason:</b> ${data.reason}<br>${data.details ? `<b>Details:</b> ${data.details}<br>` : ''}<small style='color:#888;'>Submitted: ${new Date(data.created_at).toLocaleString()}</small>`;
        // Mark as read if not already
        if (data.id && data.read === false) {
          await supabase.from('order_cancellations').update({ read: true }).eq('id', data.id);
          updateNotifBadge();
        }
      }
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open'); // Prevent background scroll
    });
  });
}

// Modal close logic for admin cancel reason
const closeCancelModalAdmin = document.querySelector('.close-cancel-modal-admin');
if (closeCancelModalAdmin) {
  closeCancelModalAdmin.onclick = () => {
    document.getElementById('cancel-reason-modal-admin').classList.add('hidden');
    document.body.classList.remove('modal-open'); // Restore background scroll
  };
}

function addActionListeners(adminEmail) {
  document.querySelectorAll('.action-btn.ship').forEach(btn => {
    btn.addEventListener('click', async e => {
      const row = e.target.closest('tr');
      const orderId = row.children[0].textContent;
      const order = allOrders.find(o => String(o.id) === String(orderId));
      if (!order) return alert('Order not found.');

      if (confirm(`Mark order ${orderId} as shipped?`)) {
        try {
          let shipperName = 'Unknown';
          if (order.shipping_option_id) {
            const { data: shippingOption } = await supabase
              .from('shipping_options')
              .select('name')
              .eq('id', order.shipping_option_id)
              .single();
            shipperName = shippingOption?.name || 'Unknown';
          }

          await supabase
            .from('orders')
            .update({ status: 'In Transit' })
            .eq('id', orderId);

          await supabase
            .from('shipment_logs')
            .insert([{
              order_id: orderId,
              status: 'Shipped',
              updated_by: adminEmail,
              shipping_option_id: order.shipping_option_id || null,
              shipper_name: shipperName
            }]);

          alert(`Order ${orderId} marked as shipped.`);

          const [updatedOrders, customers, shipmentLogs] = await Promise.all([
            fetchOrders(),
            fetchCustomers(),
            fetchShipmentLogs()
          ]);

          allOrders = attachCustomerAndShipperNames(updatedOrders, customers, shipmentLogs);
          populateOrdersTable(allOrders, adminEmail);
        } catch (err) {
          console.error('Ship error:', err.message);
          alert('Failed to mark order as shipped.');
        }
      }
    });
  });

  document.querySelectorAll('.action-btn.complete').forEach(btn => {
    btn.addEventListener('click', async e => {
      const row = e.target.closest('tr');
      const orderId = row.children[0].textContent;

      if (!confirm(`Mark order ${orderId} as completed?`)) return;

      try {
        await supabase
          .from('orders')
          .update({ status: 'Completed' })
          .eq('id', orderId);

        alert(`Order ${orderId} marked as completed.`);

        const [updatedOrders, customers, shipmentLogs] = await Promise.all([
          fetchOrders(),
          fetchCustomers(),
          fetchShipmentLogs()
        ]);

        allOrders = attachCustomerAndShipperNames(updatedOrders, customers, shipmentLogs);
        populateOrdersTable(allOrders, adminEmail);
      } catch (err) {
        console.error('Complete error:', err.message);
        alert('Failed to complete order.');
      }
    });
  });

  document.querySelectorAll('.action-btn.cancel').forEach(btn => {
    btn.addEventListener('click', async e => {
      const row = e.target.closest('tr');
      const orderId = row.children[0].textContent;

      if (!confirm(`Cancel order ${orderId}? This cannot be undone.`)) return;

      try {
        await supabase
          .from('orders')
          .update({ status: 'Cancelled' })
          .eq('id', orderId);

        alert(`Order ${orderId} was cancelled.`);

        const [updatedOrders, customers, shipmentLogs] = await Promise.all([
          fetchOrders(),
          fetchCustomers(),
          fetchShipmentLogs()
        ]);

        allOrders = attachCustomerAndShipperNames(updatedOrders, customers, shipmentLogs);
        populateOrdersTable(allOrders, adminEmail);
      } catch (err) {
        console.error('Cancel error:', err.message);
        alert('Failed to cancel order.');
      }
    });
  });
}

function setupFilterDropdowns(adminEmail) {
  const statusFilter = document.getElementById('status-filter');
  const paymentFilter = document.getElementById('payment-filter');
  const priceSort = document.getElementById('price-sort');
  const itemSort = document.getElementById('item-sort');
  const dateSort = document.getElementById('date-sort');

  function filterOrders() {
    const status = statusFilter.value;
    const payment = paymentFilter.value;
    const priceOrder = priceSort.value;
    const itemOrder = itemSort.value;
    const dateOrder = dateSort.value;
    let filtered = allOrders;
    if (status) {
      filtered = filtered.filter(order => order.status === status);
    }
    if (payment) {
      if (payment === 'PayMongo') {
        filtered = filtered.filter(order =>
          order.payment_method === 'PayMongo' ||
          order.payment_method === 'Gcash' ||
          order.payment_method === 'Grab_pay' ||
          order.payment_method === 'Paymaya' ||
          order.payment_method === 'Online Banking'
        );
      } else {
        filtered = filtered.filter(order => order.payment_method === payment);
      }
    }
    // Date sorting
    if (dateOrder) {
      filtered = filtered.slice().sort((a, b) => {
        const aDate = new Date(a.created_at);
        const bDate = new Date(b.created_at);
        if (dateOrder === 'desc') return bDate - aDate;
        if (dateOrder === 'asc') return aDate - bDate;
        return 0;
      });
    }
    // Price sorting
    if (priceOrder) {
      filtered = filtered.slice().sort((a, b) => {
        if (priceOrder === 'desc') return (b.total_price || 0) - (a.total_price || 0);
        if (priceOrder === 'asc') return (a.total_price || 0) - (b.total_price || 0);
        return 0;
      });
    }
    // Item sorting
    if (itemOrder) {
      filtered = filtered.slice().sort((a, b) => {
        const aCount = Array.isArray(a.orders) ? a.orders.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const bCount = Array.isArray(b.orders) ? b.orders.reduce((sum, item) => sum + item.quantity, 0) : 0;
        if (itemOrder === 'desc') return bCount - aCount;
        if (itemOrder === 'asc') return aCount - bCount;
        return 0;
      });
    }
    populateOrdersTable(filtered, adminEmail);
  }

  if (statusFilter) statusFilter.addEventListener('change', filterOrders);
  if (paymentFilter) paymentFilter.addEventListener('change', filterOrders);
  if (priceSort) priceSort.addEventListener('change', filterOrders);
  if (itemSort) itemSort.addEventListener('change', filterOrders);
  if (dateSort) dateSort.addEventListener('change', filterOrders);
}

// Fetch unread cancellations count and update bell badge
async function updateNotifBadge() {
  const { data, error } = await supabase
    .from('order_cancellations')
    .select('id')
    .eq('read', false);
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const count = data ? data.length : 0;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}
