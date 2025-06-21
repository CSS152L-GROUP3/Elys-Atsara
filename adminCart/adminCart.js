
import { supabase } from '../supabaseClient/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const orders = await fetchOrders();
    populateOrdersTable(orders);
  } catch (error) {
    console.error('Error loading admin cart data:', error.message || error);
    alert('Failed to load orders.');
  }
});

// Fetch orders from the 'orders' table
async function fetchOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      address_id,
      shipping_option_id,
      payment_method,
      subtotal_price,
      total_price,
      status,
      delivery_date,
      created_at,
      orders
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error.message);
    throw error;
  }

  return orders || [];
}

// Populate orders in HTML table
function populateOrdersTable(orders) {
  const tableBody = document.querySelector('.order-table tbody');

  if (!tableBody) {
    console.error('Table body not found');
    return;
  }

  tableBody.innerHTML = '';

  if (!orders.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7">No orders found.</td>';
    tableBody.appendChild(row);
    return;
  }

  orders.forEach(order => {
    const itemCount = Array.isArray(order.orders) ? order.orders.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const dateStr = new Date(order.created_at).toLocaleString();

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.user_id}</td>
      <td>${itemCount} item(s)</td>
      <td>₱${order.total_price?.toFixed(2)}</td>
      <td>${order.payment_method}</td>
      <td><span class="status ${order.status?.toLowerCase()}">${order.status}</span></td>
      <td>
        <div class="actions-container">
          <button class="action-btn view">View</button>
          <button class="action-btn ship">Ship</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  addActionListeners();
}

function addActionListeners() {
  document.querySelectorAll('.action-btn.view').forEach(btn => {
    btn.addEventListener('click', e => {
      const orderId = e.target.closest('tr').children[0].textContent;
      alert(`Viewing order ${orderId}`);
    });
  });

  document.querySelectorAll('.action-btn.ship').forEach(btn => {
    btn.addEventListener('click', e => {
      const orderId = e.target.closest('tr').children[0].textContent;
      if (confirm(`Mark order ${orderId} as shipped?`)) {
        alert(`Order ${orderId} shipped!`);
      }
    });
  });
}


