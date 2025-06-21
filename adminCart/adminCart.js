// import { supabase } from '../supabaseClient/supabase.js';

// let allOrders = [];

// document.addEventListener('DOMContentLoaded', async () => {
//   try {
//     const [orders, customers, userResult] = await Promise.all([
//       fetchOrders(),
//       fetchCustomers(),
//       supabase.auth.getUser()
//     ]);

//     if (userResult.error) throw userResult.error;

//     const adminEmail = userResult.data.user?.email || 'unknown';
//     allOrders = attachCustomerNames(orders, customers);
//     populateOrdersTable(allOrders, adminEmail);
//     setupFilterButtons(adminEmail);
//   } catch (error) {
//     console.error('Error loading admin cart data:', error.message || error);
//     alert('Failed to load orders. Check console for more info.');
//   }
// });

// async function fetchOrders() {
//   const { data, error } = await supabase
//     .from('orders')
//     .select('*')
//     .order('created_at', { ascending: false });

//   if (error) throw error;
//   return data || [];
// }

// async function fetchCustomers() {
//   const { data, error } = await supabase
//     .from('customer_accounts')
//     .select('uuid, name');

//   if (error) throw error;
//   return data || [];
// }

// function attachCustomerNames(orders, customers) {
//   const customerMap = new Map();
//   customers.forEach(c => customerMap.set(c.uuid, c.name));
//   return orders.map(order => ({
//     ...order,
//     customer_name: customerMap.get(order.user_id) || 'Unknown'
//   }));
// }

// function populateOrdersTable(orders, adminEmail) {
//   const tableBody = document.querySelector('.order-table tbody');
//   if (!tableBody) return;

//   tableBody.innerHTML = '';

//   if (!orders.length) {
//     const row = document.createElement('tr');
//     row.innerHTML = '<td colspan="7">No orders found.</td>';
//     tableBody.appendChild(row);
//     return;
//   }

//   orders.forEach(order => {
//     const itemCount = Array.isArray(order.orders)
//       ? order.orders.reduce((sum, item) => sum + item.quantity, 0)
//       : 0;

//     let actionsHTML = '';
//     if (order.status === 'Pending') {
//       actionsHTML = `
//         <button class="action-btn ship">Ship</button>
//         <button class="action-btn cancel" style="background-color: #e74c3c; color: white;">Cancel</button>
//       `;
//     } else if (order.status === 'In Transit') {
//       actionsHTML = `
//         <button class="action-btn complete" style="background-color: #2ecc71; color: white;">Complete</button>
//         <button class="action-btn cancel" style="background-color: #e74c3c; color: white;">Cancel</button>
//       `;
//     }

//     const row = document.createElement('tr');
//     row.innerHTML = `
//       <td>${order.id}</td>
//       <td>${order.customer_name}</td>
//       <td>${itemCount} item(s)</td>
//       <td>₱${order.total_price?.toFixed(2)}</td>
//       <td>${order.payment_method}</td>
//       <td><span class="status ${order.status?.toLowerCase().replace(/\s/g, '-')}">${order.status}</span></td>
//       <td>
//         <div class="actions-container">
//           ${actionsHTML}
//         </div>
//       </td>
//     `;
//     tableBody.appendChild(row);
//   });

//   addActionListeners(adminEmail);
// }

// function addActionListeners(adminEmail) {
//   document.querySelectorAll('.action-btn.ship').forEach(btn => {
//     btn.addEventListener('click', async e => {
//       const row = e.target.closest('tr');
//       const orderId = row.children[0].textContent;
//       const order = allOrders.find(o => String(o.id) === String(orderId));

//       if (!order) return alert('Order not found.');

//       if (confirm(`Mark order ${orderId} as shipped?`)) {
//         try {
//           let shipperName = 'Unknown';
//           if (order.shipping_option_id) {
//             const { data: shippingOption } = await supabase
//               .from('shipping_options')
//               .select('name')
//               .eq('id', order.shipping_option_id)
//               .single();
//             shipperName = shippingOption?.name || 'Unknown';
//           }

//           const { data: updated, error: updateError } = await supabase
//             .from('orders')
//             .update({ status: 'In Transit' })
//             .eq('id', orderId)
//             .select();

//           if (updateError) throw updateError;

//           const { error: insertError } = await supabase
//             .from('shipment_logs')
//             .insert([{
//               order_id: orderId,
//               status: 'Shipped',
//               updated_by: adminEmail,
//               shipping_option_id: order.shipping_option_id || null,
//               shipper_name: shipperName
//             }]);

//           if (insertError) throw insertError;

//           alert(`Order ${orderId} marked as shipped.`);

//           const [updatedOrders, customers] = await Promise.all([
//             fetchOrders(),
//             fetchCustomers()
//           ]);
//           allOrders = attachCustomerNames(updatedOrders, customers);
//           populateOrdersTable(allOrders, adminEmail);
//         } catch (err) {
//           console.error(' Ship error:', err.message);
//           alert('Failed to mark order as shipped.');
//         }
//       }
//     });
//   });

//   document.querySelectorAll('.action-btn.complete').forEach(btn => {
//     btn.addEventListener('click', async e => {
//       const row = e.target.closest('tr');
//       const orderId = row.children[0].textContent;

//       if (!confirm(`Mark order ${orderId} as completed?`)) return;

//       try {
//         const { error: completeError } = await supabase
//           .from('orders')
//           .update({ status: 'Completed' })
//           .eq('id', orderId);

//         if (completeError) throw completeError;

//         alert(` Order ${orderId} marked as completed.`);

//         const [updatedOrders, customers] = await Promise.all([
//           fetchOrders(),
//           fetchCustomers()
//         ]);
//         allOrders = attachCustomerNames(updatedOrders, customers);
//         populateOrdersTable(allOrders, adminEmail);
//       } catch (err) {
//         console.error('Complete error:', err.message);
//         alert('Failed to complete order.');
//       }
//     });
//   });

//   document.querySelectorAll('.action-btn.cancel').forEach(btn => {
//     btn.addEventListener('click', async e => {
//       const row = e.target.closest('tr');
//       const orderId = row.children[0].textContent;
//       const order = allOrders.find(o => String(o.id) === String(orderId));

//       if (!order) return alert('Order not found.');

//       if (confirm(`Cancel order ${orderId}? This cannot be undone.`)) {
//         try {
//           const { error: cancelError } = await supabase
//             .from('orders')
//             .update({ status: 'Cancelled' })
//             .eq('id', orderId);

//           if (cancelError) throw cancelError;

//           alert(`Order ${orderId} was cancelled.`);

//           const [updatedOrders, customers] = await Promise.all([
//             fetchOrders(),
//             fetchCustomers()
//           ]);
//           allOrders = attachCustomerNames(updatedOrders, customers);
//           populateOrdersTable(allOrders, adminEmail);
//         } catch (err) {
//           console.error('Cancel error:', err.message);
//           alert('Failed to cancel order.');
//         }
//       }
//     });
//   });
// }

// function setupFilterButtons(adminEmail) {
//   const filterButtons = document.querySelectorAll('.filter-btn');

//   filterButtons.forEach(button => {
//     button.addEventListener('click', () => {
//       filterButtons.forEach(btn => btn.classList.remove('active'));
//       button.classList.add('active');

//       const status = button.getAttribute('data-status');
//       const filtered = status === 'all'
//         ? allOrders
//         : allOrders.filter(order => order.status?.toLowerCase() === status.toLowerCase());

//       populateOrdersTable(filtered, adminEmail);
//     });
//   });
// }


import { supabase } from '../supabaseClient/supabase.js';

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
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
    setupFilterButtons(adminEmail);
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
}
