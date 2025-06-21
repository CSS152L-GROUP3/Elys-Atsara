import { supabase } from '../supabaseClient/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch both orders and customers in parallel
    const [orders, customers] = await Promise.all([
      fetchOrders(),
      fetchCustomers()
    ]);

    // Merge the customer name into each order
    const ordersWithNames = attachCustomerNames(orders, customers);

    // Populate the table with enriched data
    populateOrdersTable(ordersWithNames);
  } catch (error) {
    console.error('❌ Error loading admin cart data:', error.message || error);
    alert('Failed to load orders. Check console for more info.');
  }
});

// Fetch all orders
async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ fetchOrders() error:', error.message);
    throw error;
  }

  return data || [];
}

// Fetch all customers
async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customer_accounts')
    .select('uuid, name'); // change to full_name if that's what you're using

  if (error) {
    console.error('❌ fetchCustomers() error:', error.message);
    throw error;
  }

  return data || [];
}

// Join customer name into each order based on user_id
function attachCustomerNames(orders, customers) {
  const customerMap = new Map();
  customers.forEach(c => customerMap.set(c.uuid, c.name));

  return orders.map(order => ({
    ...order,
    customer_name: customerMap.get(order.user_id) || 'Unknown'
  }));
}

// Render table
function populateOrdersTable(orders) {
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

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer_name}</td>
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
