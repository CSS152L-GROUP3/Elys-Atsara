import { supabase } from '../supabaseClient/supabase.js';

console.log('Analytics script loaded');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM ready');

    const { data, error } = await supabase
        .from('orders')
        .select('status');

    console.log('Orders:', data);
    if (error) console.error('Supabase Error:', error.message);
});


document.addEventListener('DOMContentLoaded', () => {
    fetchOrderStatusData();
    fetchPaymentMethodData();
    fetchAverageOrderValue();
    fetchCityDistributionData();
    fetchMostOrderedProducts();
    fetchTopCustomersByOrders();
});

async function fetchOrderStatusData() {
    const { data, error } = await supabase
        .from('orders')
        .select('status');

    if (error) {
        console.error('Error fetching order status:', error.message);
        return;
    }

    const statusCounts = {
        Completed: 0,
        Pending: 0,
        Cancelled: 0
    };

    data.forEach(order => {
        const status = order.status;
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        }
    });

    renderStatusChart(statusCounts);
}

function renderStatusChart(statusCounts) {
    const chartContainer = document.getElementById('statusChart');
    const legendContainer = document.getElementById('statusLegend');

    // Clear previous content
    chartContainer.style.background = '#ddd';
    legendContainer.innerHTML = '';

    const total =
        statusCounts.Completed + statusCounts.Pending + statusCounts.Cancelled;

    const statusData = [
        { label: 'Completed', value: statusCounts.Completed, color: '#4CAF50' },
        { label: 'Pending', value: statusCounts.Pending, color: '#FFC107' },
        { label: 'Cancelled', value: statusCounts.Cancelled, color: '#F44336' }
    ];

    // Build conic-gradient string for pie chart
    let gradient = '';
    let currentPercent = 0;

    statusData.forEach((status, index) => {
        const percentage = total === 0 ? 0 : (status.value / total) * 100;
        const nextPercent = currentPercent + percentage;

        gradient += `${status.color} ${currentPercent}% ${nextPercent}%, `;
        currentPercent = nextPercent;

        // Generate legend
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${status.color};"></span>
      <span class="legend-text">${status.label}: ${status.value}</span>
    `;
        legendContainer.appendChild(legendItem);
    });

    // Apply gradient as background
    chartContainer.style.background = `conic-gradient(${gradient.slice(0, -2)})`;
}

async function fetchPaymentMethodData() {
    const { data, error } = await supabase
        .from('orders')
        .select('payment_method');

    if (error) {
        console.error('Error fetching payment methods:', error.message);
        return;
    }

    // Normalized counts
    const methodCounts = {
        'Cash on Delivery': 0,
        'GCash': 0,
        'Maya': 0,
        'Card': 0
    };

    data.forEach(order => {
        if (!order.payment_method) return;

        // Normalize method string (trim, lowercase, remove extra spaces)
        const method = order.payment_method.trim().toLowerCase();

        if (method === 'cash on delivery') {
            methodCounts['Cash on Delivery']++;
        } else if (method === 'gcash') {
            methodCounts['GCash']++;
        } else if (method === 'maya') {
            methodCounts['Maya']++;
        } else if (method === 'card') {
            methodCounts['Card']++;
        }
    });

    renderPaymentChart(methodCounts);
}



function renderPaymentChart(methodCounts) {
    const chartContainer = document.getElementById('paymentChart');
    const legendContainer = document.getElementById('paymentLegend');

    // Clear/reset
    chartContainer.style.background = '#ddd';
    legendContainer.innerHTML = '';

    const total = Object.values(methodCounts).reduce((sum, val) => sum + val, 0);

    const paymentData = [
        { label: 'Cash on Delivery', value: methodCounts['Cash on Delivery'], color: '#2196F3' },
        { label: 'GCash', value: methodCounts['GCash'], color: '#00C853' },
        { label: 'Maya', value: methodCounts['Maya'], color: '#6200EA' },
        { label: 'Card', value: methodCounts['Card'], color: '#FF5722' }
    ];

    // Build the gradient string
    let gradient = '';
    let currentPercent = 0;

    paymentData.forEach(method => {
        const percentage = total === 0 ? 0 : (method.value / total) * 100;
        const nextPercent = currentPercent + percentage;

        if (percentage > 0) {
            gradient += `${method.color} ${currentPercent}% ${nextPercent}%, `;
        }

        currentPercent = nextPercent;

        // Build legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${method.color};"></span>
      <span class="legend-text">${method.label}: ${method.value}</span>
    `;
        legendContainer.appendChild(legendItem);
    });

    if (gradient !== '') {
        chartContainer.style.background = `conic-gradient(${gradient.slice(0, -2)})`;
    }
}

async function fetchAverageOrderValue() {
    const { data, error } = await supabase
        .from('orders')
        .select('total_price');

    if (error) {
        console.error('Error fetching total_price:', error.message);
        return;
    }

    const totalOrders = data.length;

    const totalRevenue = data.reduce((sum, order) => {
        return sum + (order.total_price || 0);
    }, 0);

    const average = totalOrders === 0 ? 0 : totalRevenue / totalOrders;

    renderAverageOrderValue(average);
}

function renderAverageOrderValue(value) {
    const container = document.getElementById('averageOrderValue');
    container.textContent = `₱${value.toFixed(2)}`;
}

async function fetchCityDistributionData() {
    // Step 1: Fetch all orders with address_id
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('address_id');

    if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError.message);
        return;
    }

    console.log('✅ Fetched orders:', orders);

    const addressIds = orders.map(order => order.address_id).filter(Boolean);
    console.log('🧾 addressIds from orders:', addressIds);

    // Step 2: Fetch all customer_addresses (you could optimize by filtering with IDs)
    const { data: addresses, error: addressError } = await supabase
        .from('customer_addresses')
        .select('id, city')
        .in('id', addressIds); // ⬅️ Only fetch addresses used in orders


    if (addressError) {
        console.error('❌ Error fetching addresses:', addressError.message);
        return;
    }

    console.log('✅ Fetched addresses:', addresses);

    // Step 3: Create map from address_id → city
    const addressMap = {};
    addresses.forEach(addr => {
        if (addr.id && addr.city) {
            addressMap[addr.id] = addr.city.trim();
        }
    });

    console.log('📍 Address ID → City Map:', addressMap);

    // Step 4: Count orders by city
    const cityCounts = {};
    orders.forEach(order => {
        const city = addressMap[order.address_id];
        if (city) {
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
    });

    console.log('📊 Final City Counts:', cityCounts);

    // Step 5: Render
    renderCityChart(cityCounts);
}


function renderCityChart(cityCounts) {
    const chartContainer = document.getElementById('cityBarChart');
    chartContainer.innerHTML = '';

    const total = Object.values(cityCounts).reduce((sum, count) => sum + count, 0);
    const maxCount = Math.max(...Object.values(cityCounts));

    Object.entries(cityCounts).forEach(([city, count]) => {
        const percentage = total === 0 ? 0 : (count / maxCount) * 100;

        const barItem = document.createElement('div');
        barItem.className = 'bar-item';

        barItem.innerHTML = `
      <div class="bar-label">${city}</div>
      <div class="bar">
        <div class="bar-fill" style="width: ${percentage}%; background-color: #B3261E;"></div>
      </div>
      <div class="bar-value">${count}</div>
    `;

        chartContainer.appendChild(barItem);
    });
}

async function fetchMostOrderedProducts() {
    // 1. Fetch orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('orders');

    if (error) {
        console.error('❌ Error fetching orders:', error.message);
        return;
    }

    const productCountMap = {};

    // 2. Count product quantities per product_id
    orders.forEach(order => {
        (order.orders || []).forEach(item => {
            const { product_id, quantity } = item;
            if (!product_id) return;
            productCountMap[product_id] = (productCountMap[product_id] || 0) + (quantity || 0);
        });
    });

    const productIds = Object.keys(productCountMap);
    if (productIds.length === 0) return;

    // 3. Fetch product names AND descriptions
    const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, description')
        .in('id', productIds);

    if (productError) {
        console.error('❌ Error fetching products:', productError.message);
        return;
    }

    // 4. Combine name + description + quantity
    const productData = products.map(product => ({
        name: product.name,
        description: product.description || '-',
        quantity: productCountMap[product.id] || 0
    }));

    // 5. Sort by quantity descending
    productData.sort((a, b) => b.quantity - a.quantity);

    // 6. Render into table
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    productData.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.description}</td>
      <td>${product.quantity}</td>
    `;
        tbody.appendChild(row);
    });
}


async function fetchTopCustomersByOrders() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('user_id, total_price');

    if (error) {
        console.error('❌ Error fetching orders:', error.message);
        return;
    }

    const customerStats = {};
    orders.forEach(order => {
        const userId = order.user_id;
        const price = order.total_price || 0;

        if (!userId) return;

        if (!customerStats[userId]) {
            customerStats[userId] = { orders: 1, totalSpent: price };
        } else {
            customerStats[userId].orders += 1;
            customerStats[userId].totalSpent += price;
        }
    });

    const sorted = Object.entries(customerStats)
        .sort((a, b) => b[1].orders - a[1].orders)
        .slice(0, 5);

    const topUserIds = sorted.map(([userId]) => userId);

    const { data: customers, error: customerError } = await supabase
        .from('customer_accounts')
        .select('uuid, name')
        .in('uuid', topUserIds);

    if (customerError) {
        console.error('❌ Error fetching customer info:', customerError.message);
        return;
    }

    const tbody = document.getElementById('topCustomersTableBody');
    tbody.innerHTML = '';

    sorted.forEach(([userId, stats]) => {
        const customer = customers.find(c => c.uuid === userId);
        const name = customer?.name || 'Unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${name}</td>
      <td>${stats.orders}</td>
      <td>₱${stats.totalSpent.toFixed(2)}</td>
    `;
        tbody.appendChild(row);
    });
}
