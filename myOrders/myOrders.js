// import { supabase } from '../supabaseClient/supabase.js';

// let allOrders = [];

// document.addEventListener('DOMContentLoaded', async () => {
//   try {
//     const { data: { user }, error } = await supabase.auth.getUser();
//     if (error || !user) throw error || new Error('User not logged in');

//     const [orders, shipmentLogs] = await Promise.all([
//       fetchOrders(user.id),
//       fetchShipmentLogs()
//     ]);

//     allOrders = attachShipperNames(orders, shipmentLogs);
//     populateTable(allOrders);

//     document.querySelectorAll('.filter-btn').forEach(btn => {
//       btn.addEventListener('click', () => {
//         const status = btn.dataset.status;
//         const filtered = status === 'all'
//           ? allOrders
//           : allOrders.filter(order => order.status === status);
//         populateTable(filtered);
//       });
//     });

//   } catch (err) {
//     console.error('Error loading orders:', err.message);
//     alert('Failed to load orders.');
//   }
// });

// async function fetchOrders(userId) {
//   const { data, error } = await supabase
//     .from('orders')
//     .select('*')
//     .eq('user_id', userId)
//     .order('created_at', { ascending: false });

//   if (error) throw error;
//   return data || [];
// }

// async function fetchShipmentLogs() {
//   const { data, error } = await supabase
//     .from('shipment_logs')
//     .select('order_id, shipper_name');

//   if (error) throw error;
//   return data || [];
// }

// function attachShipperNames(orders, shipmentLogs) {
//   const shipperMap = new Map();
//   shipmentLogs.forEach(log => {
//     if (!shipperMap.has(log.order_id)) {
//       shipperMap.set(log.order_id, log.shipper_name);
//     }
//   });

//   return orders.map(order => ({
//     ...order,
//     shipper_name: shipperMap.get(order.id) || null
//   }));
// }
// function populateTable(orders) {
//   const tbody = document.querySelector('.order-table tbody');
//   tbody.innerHTML = '';

//   if (!orders.length) {
//     tbody.innerHTML = `<tr><td colspan="7">No orders found.</td></tr>`;
//     return;
//   }

//   orders.forEach(order => {
//     const itemCount = Array.isArray(order.orders)
//       ? order.orders.reduce((sum, item) => sum + item.quantity, 0)
//       : 0;

//     const shipperText = order.status === 'In Transit' && order.shipper_name
//       ? `<br><small>Shipper: ${order.shipper_name}</small>`
//       : '';

//     const row = document.createElement('tr');
//     row.innerHTML = `
//       <td>${order.id}</td>
//       <td>${itemCount} item(s)</td>
//       <td>₱${order.total_price?.toFixed(2)}</td>
//       <td>${order.payment_method}</td>
//       <td>${new Date(order.created_at).toLocaleString()}</td>
//       <td>
//         <span class="status ${order.status.toLowerCase().replace(/\s/g, '-')}">
//           ${order.status}${shipperText}
//         </span>
//       </td>
//       <td>
//         ${order.status === 'Pending' ? `<button class="cancel-btn" data-id="${order.id}">Cancel</button>` : ''}
//         <!-- Reorder button removed -->
//       </td>
//     `;
//     tbody.appendChild(row);
//   });

//   attachCancelListeners();
// }


// function attachCancelListeners() {
//   document.querySelectorAll('.cancel-btn').forEach(btn => {
//     btn.addEventListener('click', async () => {
//       const orderId = btn.dataset.id;
//       if (!confirm('Cancel this order?')) return;

//       const { error } = await supabase
//         .from('orders')
//         .update({ status: 'Cancelled' })
//         .eq('id', orderId);

//       if (error) {
//         alert('Failed to cancel order.');
//       } else {
//         alert('Order cancelled.');
//         location.reload();
//       }
//     });
//   });
// }

// function attachReorderListeners() {
//   document.querySelectorAll('.reorder-btn').forEach(btn => {
//     btn.addEventListener('click', async () => {
//       try {
//         const orderData = JSON.parse(decodeURIComponent(btn.dataset.order));
//         const items = orderData.orders;
//         const originalOrderId = orderData.id;

//         if (!Array.isArray(items) || items.length === 0) {
//           alert('This order has no items to reorder.');
//           return;
//         }

       
//         const { data: { user }, error: userError } = await supabase.auth.getUser();
//         if (userError || !user) throw userError;

     
//         const { data: fullOrder, error: fetchError } = await supabase
//           .from('orders')
//           .select('*')
//           .eq('id', originalOrderId)
//           .single();

//         if (fetchError || !fullOrder) throw fetchError || new Error('Original order not found.');

//         const { error: insertError } = await supabase.from('orders').insert([
//           {
//             user_id: user.id,
//             status: 'Pending',
//             payment_method: fullOrder.payment_method,
//             shipping_option_id: fullOrder.shipping_option_id,
//             shipping_address_id: fullOrder.shipping_address_id, // if you use this
//             total_price: fullOrder.total_price,
//             orders: fullOrder.orders
//           }
//         ]);

//         if (insertError) {
//           console.error(insertError);
//           alert('Failed to place reorder.');
//         } else {
//           alert('Reorder placed successfully!');
//           location.reload();
//         }

//       } catch (err) {
//         console.error('Reorder error:', err);
//         alert('An error occurred during reorder.');
//       }
//     });
//   });
// }

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
    b.onclick = async () => {
      const id = b.dataset.id;
      if (!confirm('Cancel order?')) return;
      const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', id);
      if (error) alert('Cancel failed');
      else loadOrders();
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
