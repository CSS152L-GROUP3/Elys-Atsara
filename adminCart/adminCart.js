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
        .select('id, order_id, reason, details, created_at, read')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      notifDropdown.innerHTML = '';
      if (error || !data || data.length === 0) {
        notifDropdown.innerHTML = '<div class="notif-empty">No recent notifications.</div>';
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
              <b>Order:</b> <span style=\"color:#b3261e; font-size:0.97rem; font-weight:600;\">${item.order_id}</span><br>
              ${order.payment_method ? `<span>Payment: <b>${order.payment_method}</b></span>` : ''}
              ${order.total_price !== undefined ? `<span>Total: <b>₱${Number(order.total_price).toFixed(2)}</b></span>` : ''}
              <b>Reason:</b> ${item.reason || 'N/A'}<br>
              <small style=\"color:#888;\">${new Date(item.created_at).toLocaleString()}</small>
            </div>
          `;
        });
        // Add click listeners to notif items
        notifDropdown.querySelectorAll('.notif-item').forEach(div => {
          div.addEventListener('click', async function () {
            const notifId = this.getAttribute('data-notif-id');
            // Mark as read in DB
            await supabase.from('order_cancellations').update({ read: true }).eq('id', notifId);
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

      // Show custom ship confirmation modal
      const shipModal = document.getElementById('ship-confirm-modal');
      const shipMsg = document.getElementById('ship-confirm-message');
      const shipNoBtn = document.getElementById('ship-no-btn');
      const shipYesBtn = document.getElementById('ship-yes-btn');
      shipMsg.textContent = `Mark order ${orderId} as shipped?`;
      shipModal.classList.remove('hidden');
      document.body.classList.add('modal-open');

      // Helper to close ship modal
      function closeShipModal() {
        shipModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }

      // No button closes modal
      shipNoBtn.onclick = () => {
        closeShipModal();
      };

      // Yes button proceeds with shipping
      shipYesBtn.onclick = async () => {
        closeShipModal();
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

          // Notify user in app
          await supabase
            .from('user_notifications')
            .insert([{
              user_id: order.user_id,
              type: 'shipped',
              order_id: orderId,
              message: 'Your order has been shipped!',
              details: '',
              read: false
            }]);

          // ✅ EmailJS: Send shipping email
          try {
            const { data: customerData, error: customerError } = await supabase
              .from('customer_accounts')
              .select('name, email')
              .eq('uuid', order.user_id)
              .single();

            if (customerError || !customerData) {
              console.warn('Failed to fetch customer info for email.');
            } else {
              const { name: customerName, email: customerEmail } = customerData;

              // Get product names
              let itemDescriptions = '';
              if (Array.isArray(order.orders)) {
                const { data: productData } = await supabase
                  .from('products')
                  .select('id, name');

                const productMap = new Map();
                productData?.forEach(p => productMap.set(p.id, p.name));

                itemDescriptions = order.orders.map(item => {
                  const productName = productMap.get(item.product_id) || 'Unknown Item';
                  return `${item.quantity}x ${productName}`;
                }).join(', ');
              }

              const templateParams = {
                customer_name: customerName,
                customer_email: customerEmail,
                order_id: order.id,
                order_items: itemDescriptions,
                order_total: `₱${Number(order.total_price).toFixed(2)}`,
                courier_name: shipperName,
                estimated_delivery: '5–7 business days'
              };

              await emailjs.send(
                'service_mcoaibi',         // Replace with your EmailJS Service ID
                'template_e8myudk',        // Your shipping email template ID
                templateParams,
                'JI6yF58k0ZqbJRKPv'        // Your public key
              );

              console.log('📦 Shipping email sent to customer:', customerEmail);
            }
          } catch (emailErr) {
            console.error('❌ Failed to send shipping email:', emailErr);
          }

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
      };
    });
  });

  document.querySelectorAll('.action-btn.complete').forEach(btn => {
    btn.addEventListener('click', async e => {
      const row = e.target.closest('tr');
      const orderId = row.children[0].textContent;

      if (!confirm(`Mark order ${orderId} as completed?`)) return;

      try {
        // 1. Mark as completed
        await supabase
          .from('orders')
          .update({ status: 'Completed' })
          .eq('id', orderId);

        // 2. Fetch full order info
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, user_id, orders, total_price')
          .eq('id', orderId)
          .single();

        // 3. Fetch customer info
        const { data: customer } = await supabase
          .from('customer_accounts')
          .select('name, email')
          .eq('uuid', orderData.user_id)
          .single();

        // 4. Get product names
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
        console.log({
          customer_name: customer?.name || "Customer",
          customer_email: customer?.email || "no-reply@example.com",
          order_id: orderData.id,
          order_items: itemDescriptions,
          order_total: `₱${orderData.total_price?.toFixed(2)}`
        });

        // 5. Send Email
        try {
          await emailjs.send("service_mcoaibi", "template_yvfiwpl", {
            customer_name: customer?.name || "Customer",
            customer_email: customer?.email || "no-reply@example.com",
            order_id: orderData.id,
            order_items: itemDescriptions,
            order_total: `₱${orderData.total_price?.toFixed(2)}`
          });
          console.log("✅ Completion email sent");
        } catch (err) {
          console.error("❌ Failed to send completion email:", err);
        }

        alert(`Order ${orderId} marked as completed and email sent.`);


        const [updatedOrders, customers, shipmentLogs] = await Promise.all([
          fetchOrders(),
          fetchCustomers(),
          fetchShipmentLogs()
        ]);

        allOrders = attachCustomerAndShipperNames(updatedOrders, customers, shipmentLogs);
        populateOrdersTable(allOrders, adminEmail);
      } catch (err) {
        console.error("❌ Failed to send completion email:", err);
        alert(`Failed to send email: ${err?.text || err?.message || 'Unknown error'}`);
      }
    });
  });

  document.querySelectorAll('.action-btn.cancel').forEach(btn => {
    btn.addEventListener('click', async e => {
      const row = e.target.closest('tr');
      const orderId = row.children[0].textContent;
      const order = allOrders.find(o => String(o.id) === String(orderId));
      if (!order) return alert('Order not found.');

      // Show custom modal for cancellation reason
      const modal = document.getElementById('cancel-reason-modal-admin-custom');
      const reasonInput = document.getElementById('cancel-reason-input-admin');
      const cancelBtn = document.getElementById('cancel-reason-cancel-btn-admin');
      const submitBtn = document.getElementById('cancel-reason-submit-btn-admin');
      reasonInput.value = '';
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');

      // Helper to close modal
      function closeModal() {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }

      // Cancel button closes modal
      cancelBtn.onclick = () => {
        closeModal();
      };

      // Submit button logic
      submitBtn.onclick = async () => {
        const reason = reasonInput.value.trim();
        if (!reason) {
          alert('Cancellation reason is required.');
          return;
        }
        closeModal();
        // Show custom confirmation modal
        const confirmModal = document.getElementById('final-cancel-confirm-modal');
        const confirmMsg = document.getElementById('final-cancel-confirm-message');
        const noBtn = document.getElementById('final-cancel-no-btn');
        const yesBtn = document.getElementById('final-cancel-yes-btn');
        confirmMsg.textContent = `Cancel order ${orderId}? This cannot be undone.`;
        confirmModal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        // Helper to close confirm modal
        function closeConfirmModal() {
          confirmModal.classList.add('hidden');
          document.body.classList.remove('modal-open');
        }

        // No button closes modal
        noBtn.onclick = () => {
          closeConfirmModal();
        };

        // Yes button proceeds with cancellation
        yesBtn.onclick = async () => {
          closeConfirmModal();
          try {
            await supabase
              .from('orders')
              .update({ status: 'Cancelled' })
              .eq('id', orderId);

            // Save cancellation reason to order_cancellations
            await supabase
              .from('order_cancellations')
              .insert([{
                order_id: orderId,
                reason: reason,
                read: false,
                created_at: new Date().toISOString()
              }]);

            // Notify user their order was cancelled, include reason
            await supabase
              .from('user_notifications')
              .insert([{
                user_id: order.user_id,
                type: 'cancelled',
                order_id: orderId,
                message: 'Your order was cancelled by the admin.',
                details: reason,
                read: false
              }]);

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
        };
      };
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
