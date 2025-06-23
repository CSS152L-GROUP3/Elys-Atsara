import { supabase } from '../supabaseClient/supabase.js';

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('User not logged in');

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
          : allOrders.filter(order => order.status === status);
        populateTable(filtered);
      });
    });

  } catch (err) {
    console.error('Error loading orders:', err.message);
    alert('Failed to load orders.');
  }
});

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

function attachShipperNames(orders, shipmentLogs) {
  const shipperMap = new Map();
  shipmentLogs.forEach(log => {
    if (!shipperMap.has(log.order_id)) {
      shipperMap.set(log.order_id, log.shipper_name);
    }
  });

  return orders.map(order => ({
    ...order,
    shipper_name: shipperMap.get(order.id) || null
  }));
}

function populateTable(orders) {
  const tbody = document.querySelector('.order-table tbody');
  tbody.innerHTML = '';

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7">No orders found.</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const itemCount = Array.isArray(order.orders)
      ? order.orders.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    const shipperText = order.status === 'In Transit' && order.shipper_name
      ? `<br><small>Shipper: ${order.shipper_name}</small>`
      : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${itemCount} item(s)</td>
      <td>₱${order.total_price?.toFixed(2)}</td>
      <td>${order.payment_method}</td>
      <td>${new Date(order.created_at).toLocaleString()}</td>
      <td>
        <span class="status ${order.status.toLowerCase().replace(/\s/g, '-')}">
          ${order.status}${shipperText}
        </span>
      </td>
      <td>
        ${order.status === 'Pending' ? `<button class="cancel-btn" data-id="${order.id}">Cancel</button>` : ''}
        ${order.status === 'Cancelled' ? `<button class="reorder-btn" data-items='${JSON.stringify(order.orders)}'>Reorder</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });

  attachCancelListeners();
  attachReorderListeners();
}

function attachCancelListeners() {
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      if (!confirm('Cancel this order?')) return;

      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', orderId);

      if (error) {
        alert('Failed to cancel order.');
      } else {
        alert('Order cancelled.');
        location.reload();
      }
    });
  });
}

function attachReorderListeners() {
  document.querySelectorAll('.reorder-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const items = JSON.parse(btn.dataset.items);
      const row = btn.closest('tr');
      const statusText = row.querySelector('.status')?.textContent?.trim();

      if (statusText !== 'Cancelled') {
        alert('You can only reorder cancelled orders.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const inserts = items.map(i => ({
        user_id: user.id,
        product_id: i.product_id,
        quantity: i.quantity
      }));

      const { error } = await supabase
        .from('cart_items')
        .upsert(inserts, { onConflict: ['user_id', 'product_id'] });

      if (error) {
        alert('Reorder failed.');
      } else {
        alert('Items added to cart.');
        window.location.href = '../updatedCartPage/Cartpage.html';
      }
    });
  });
}
