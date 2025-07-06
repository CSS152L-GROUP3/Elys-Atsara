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
    
    // Add export event listeners
    document.getElementById("exportCSV").addEventListener("click", exportToCSV);
    document.getElementById("exportPDF").addEventListener("click", exportToPDF);
});

// === GLOBAL ANALYTICS VARIABLES FOR EXPORT ===
let totalOrders = 0;
let avgOrderValue = 0;
let productTableData = [];
let customerTableData = [];

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

let statusChartInstance = null;
function renderStatusChart(statusCounts) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const labels = Object.keys(statusCounts);
    const data = labels.map(label => statusCounts[label]);
    // Use the same color order as before, but match to labels
    const colorMap = {
        'Completed': '#4CAF50',
        'Pending': '#FFC107',
        'Cancelled': '#F44336'
    };
    const colors = labels.map(label => colorMap[label] || '#888');
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });
    // Dynamic legend
    const legendContainer = document.getElementById('statusLegend');
    legendContainer.innerHTML = labels.map((label, i) =>
        `<span style="display:inline-flex;align-items:center;margin-right:16px;">
            <span style="display:inline-block;width:14px;height:14px;background:${colors[i]};margin-right:6px;border-radius:3px;"></span>
            <span style="font-size:0.95em;">${label}: ${data[i]}</span>
        </span>`
    ).join('');
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

let paymentChartInstance = null;
function renderPaymentChart(methodCounts) {
    const ctx = document.getElementById('paymentChart').getContext('2d');
    const labels = Object.keys(methodCounts);
    const data = labels.map(label => methodCounts[label]);
    // Use the same color order as before, but match to labels
    const colorMap = {
        'Cash on Delivery': '#2196F3',
        'GCash': '#00C853',
        'Maya': '#6200EA',
        'Card': '#FF5722'
    };
    const colors = labels.map(label => colorMap[label] || '#888');
    if (paymentChartInstance) paymentChartInstance.destroy();
    paymentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });
    // Dynamic legend
    const legendContainer = document.getElementById('paymentLegend');
    legendContainer.innerHTML = labels.map((label, i) =>
        `<span style="display:inline-flex;align-items:center;margin-right:16px;">
            <span style="display:inline-block;width:14px;height:14px;background:${colors[i]};margin-right:6px;border-radius:3px;"></span>
            <span style="font-size:0.95em;">${label}: ${data[i]}</span>
        </span>`
    ).join('');
}

async function fetchAverageOrderValue() {
    const { data, error } = await supabase
        .from('orders')
        .select('total_price');

    if (error) {
        console.error('Error fetching total_price:', error.message);
        return;
    }

    totalOrders = data.length;
    const totalRevenue = data.reduce((sum, order) => {
        return sum + (order.total_price || 0);
    }, 0);

    avgOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;

    renderAverageOrderValue(avgOrderValue);
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
        productTableData = [];
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
    if (productIds.length === 0) {
        productTableData = [];
        return;
    }

    // 3. Fetch product names AND descriptions
    const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, description')
        .in('id', productIds);

    if (productError) {
        console.error('❌ Error fetching products:', productError.message);
        productTableData = [];
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

    productTableData = [];
    productData.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.description}</td>
      <td>${product.quantity}</td>
    `;
        tbody.appendChild(row);
        productTableData.push([product.name, product.description, product.quantity]);
    });
}

// Export Functions
async function exportToCSV() {
    try {
        // Fetch all necessary data for analytics sections
        const [ordersData, productsData, customersData, addressesData] = await Promise.all([
            supabase.from('orders').select('*'),
            supabase.from('products').select('*'),
            supabase.from('customer_accounts').select('*'),
            supabase.from('customer_addresses').select('*')
        ]);

        // Create focused CSV content
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // === REPORT HEADER ===
        csvContent += "ELY'S ATSARA - DATA ANALYTICS REPORT\n";
        csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
        csvContent += `Report Type: Analytics Summary\n\n`;

        // === ORDER STATUS DISTRIBUTION ===
        if (ordersData.data) {
            csvContent += "ORDER STATUS DISTRIBUTION\n";
            csvContent += "Status,Count,Percentage\n";
            const statusCounts = {};
            ordersData.data.forEach(order => {
                const status = order.status || 'Unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            const totalOrders = ordersData.data.length;
            Object.entries(statusCounts).forEach(([status, count]) => {
                const percentage = ((count / totalOrders) * 100).toFixed(1);
                csvContent += `${status},${count},${percentage}%\n`;
            });
            csvContent += "\n";
        }

        // === PAYMENT METHOD PREFERENCE ===
        if (ordersData.data) {
            csvContent += "PAYMENT METHOD PREFERENCE\n";
            csvContent += "Payment Method,Orders,Percentage\n";
            const methodCounts = {};
            ordersData.data.forEach(order => {
                const method = order.payment_method || 'Unknown';
                methodCounts[method] = (methodCounts[method] || 0) + 1;
            });
            
            const totalOrders = ordersData.data.length;
            Object.entries(methodCounts).forEach(([method, count]) => {
                const percentage = ((count / totalOrders) * 100).toFixed(1);
                csvContent += `${method},${count},${percentage}%\n`;
            });
            csvContent += "\n";
        }

        // === AVERAGE ORDER VALUE ===
        if (ordersData.data) {
            csvContent += "AVERAGE ORDER VALUE\n";
            csvContent += "Metric,Value\n";
            const totalOrders = ordersData.data.length;
            const totalRevenue = ordersData.data.reduce((sum, order) => sum + (order.total_price || 0), 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            csvContent += `Total Orders,${totalOrders}\n`;
            csvContent += `Total Revenue,₱${totalRevenue.toFixed(2)}\n`;
            csvContent += `Average Order Value,₱${avgOrderValue.toFixed(2)}\n\n`;
        }

        // === ORDER DISTRIBUTION BY LOCATION ===
        if (ordersData.data && addressesData.data) {
            csvContent += "ORDER DISTRIBUTION BY LOCATION\n";
            csvContent += "City,Orders,Percentage\n";
            
            // Create address map
            const addressMap = {};
            addressesData.data.forEach(addr => {
                if (addr.id && addr.city) {
                    addressMap[addr.id] = addr.city.trim();
                }
            });
            
            // Count orders by city
            const cityCounts = {};
            ordersData.data.forEach(order => {
                const city = addressMap[order.address_id];
                if (city) {
                    cityCounts[city] = (cityCounts[city] || 0) + 1;
                }
            });
            
            const totalOrders = ordersData.data.length;
            Object.entries(cityCounts).forEach(([city, count]) => {
                const percentage = ((count / totalOrders) * 100).toFixed(1);
                csvContent += `${city},${count},${percentage}%\n`;
            });
            csvContent += "\n";
        }

        // === MOST FREQUENTLY ORDERED PRODUCTS ===
        if (ordersData.data && productsData.data) {
            csvContent += "MOST FREQUENTLY ORDERED PRODUCTS\n";
            csvContent += "Rank,Product Name,Description,Units Sold\n";
            
            // Count product quantities
            const productCountMap = {};
            ordersData.data.forEach(order => {
                (order.orders || []).forEach(item => {
                    const { product_id, quantity } = item;
                    if (!product_id) return;
                    productCountMap[product_id] = (productCountMap[product_id] || 0) + (quantity || 0);
                });
            });
            
            // Get product details and sort
            const productData = productsData.data
                .filter(product => productCountMap[product.id])
                .map(product => ({
                    name: product.name,
                    description: product.description || '-',
                    quantity: productCountMap[product.id] || 0
                }))
                .sort((a, b) => b.quantity - a.quantity);
            
            productData.forEach((product, index) => {
                const description = product.description.replace(/"/g, '""'); // Escape quotes
                csvContent += `${index + 1},"${product.name}","${description}",${product.quantity}\n`;
            });
            csvContent += "\n";
        }

        // === TOP 5 CUSTOMERS (MOST ORDERS) ===
        if (ordersData.data && customersData.data) {
            csvContent += "TOP 5 CUSTOMERS (MOST ORDERS)\n";
            csvContent += "Rank,Customer Name,Orders Placed,Total Spent\n";
            
            // Calculate customer stats
            const customerStats = {};
            ordersData.data.forEach(order => {
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
            
            // Sort and get top 5
            const sorted = Object.entries(customerStats)
                .sort((a, b) => b[1].orders - a[1].orders)
                .slice(0, 5);
            
            sorted.forEach(([userId, stats], index) => {
                const customer = customersData.data.find(c => c.uuid === userId);
                const name = customer?.name || 'Unknown';
                csvContent += `${index + 1},"${name}",${stats.orders},₱${stats.totalSpent.toFixed(2)}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `data_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Error exporting CSV. Please try again.');
    }
}

// NOTE: statusChart and paymentChart are now Chart.js canvases, so use .toDataURL().
// cityBarChart may still be a div, so use html2canvas for that one.
document.getElementById("exportPDF").addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    function addHeader(doc, pageWidth) {
        doc.setFillColor(230, 230, 230);
        doc.rect(14, 8, 24, 24, 'F');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Data Analytics Report", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Prepared by: Ely's Atsara`, pageWidth - 14, 15, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 25, { align: 'right' });
        doc.setDrawColor(180);
        doc.line(14, 34, pageWidth - 14, 34);
    }

    function addFooter(doc, pageNumber, totalPages, pageWidth, pageHeight) {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    addHeader(doc, pageWidth);
    let y = 40;

    // --- SUMMARY METRICS ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text("ANALYTICS SUMMARY", 14, y);
    y += 12;

    // Calculate additional metrics
    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    
    if (statusChartInstance && statusChartInstance.data) {
        const chartData = statusChartInstance.data;
        const labels = chartData.labels;
        const data = chartData.datasets[0].data;
        
        labels.forEach((label, index) => {
            if (label === 'Completed') completedOrders = data[index];
            if (label === 'Pending') pendingOrders = data[index];
            if (label === 'Cancelled') cancelledOrders = data[index];
        });
    }
    
    totalRevenue = totalOrders * avgOrderValue;

    const metricsBoxY = y;
    const metricsBoxHeight = 84;
    doc.setFillColor(248, 249, 250);
    doc.rect(14, y, pageWidth - 28, metricsBoxHeight, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(14, y, pageWidth - 28, metricsBoxHeight, 'S');
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 123, 255);
    doc.text("TOTAL ORDERS:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(typeof totalOrders !== 'undefined' ? String(totalOrders) : 'N/A', 70, y);
    y += 12;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(253, 126, 20);
    doc.text("AVERAGE ORDER VALUE:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(typeof avgOrderValue !== 'undefined' ? `₱${avgOrderValue.toFixed(2)}` : 'N/A', 70, y);
    y += 12;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 167, 69);
    doc.text("TOTAL REVENUE:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(`₱${totalRevenue.toFixed(2)}`, 70, y);
    y += 12;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text("COMPLETION RATE:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;
    doc.text(`${completionRate}%`, 70, y);
    y += 12;

    y = metricsBoxY + metricsBoxHeight + 20;

    // --- CHARTS WITH DYNAMIC LEGENDS ---
    // 1. statusChart (canvas)
    const statusChartCanvas = document.getElementById('statusChart');
    if (statusChartCanvas && statusChartCanvas.toDataURL) {
        if (y > pageHeight - (90 + 50)) {
            doc.addPage();
            addHeader(doc, pageWidth);
            y = 40;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Order Status Distribution', 14, y);
        y += 8;
        const imgData = statusChartCanvas.toDataURL("image/png", 1.0);
        doc.addImage(imgData, "PNG", 14, y, 180, 90);
        y += 90 + 5;
        // Dynamic legend from chart instance
        if (statusChartInstance) {
            const chartData = statusChartInstance.data;
            const labels = chartData.labels;
            const data = chartData.datasets[0].data;
            const colors = chartData.datasets[0].backgroundColor;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            let legendX = 20;
            let legendY = y;
            for (let i = 0; i < labels.length; i++) {
                doc.setFillColor(colors[i]);
                doc.rect(legendX, legendY, 8, 8, 'F');
                doc.setTextColor(51, 51, 51);
                doc.text(`${labels[i]}: ${data[i]}`, legendX + 12, legendY + 7);
                legendX += 60;
                if (legendX > pageWidth - 60) {
                    legendX = 20;
                    legendY += 12;
                }
            }
            y = legendY + 15;
        }
    }

    // 2. paymentChart (canvas)
    const paymentChartCanvas = document.getElementById('paymentChart');
    if (paymentChartCanvas && paymentChartCanvas.toDataURL) {
        if (y > pageHeight - (90 + 50)) {
            doc.addPage();
            addHeader(doc, pageWidth);
            y = 40;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method Preference', 14, y);
        y += 8;
        const imgData = paymentChartCanvas.toDataURL("image/png", 1.0);
        doc.addImage(imgData, "PNG", 14, y, 180, 90);
        y += 90 + 5;
        // Dynamic legend from chart instance
        if (paymentChartInstance) {
            const chartData = paymentChartInstance.data;
            const labels = chartData.labels;
            const data = chartData.datasets[0].data;
            const colors = chartData.datasets[0].backgroundColor;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            let legendX = 20;
            let legendY = y;
            for (let i = 0; i < labels.length; i++) {
                doc.setFillColor(colors[i]);
                doc.rect(legendX, legendY, 8, 8, 'F');
                doc.setTextColor(51, 51, 51);
                doc.text(`${labels[i]}: ${data[i]}`, legendX + 12, legendY + 7);
                legendX += 60;
                if (legendX > pageWidth - 60) {
                    legendX = 20;
                    legendY += 12;
                }
            }
            y = legendY + 15;
        }
    }

    // 3. Order Distribution by Location (as text list)
    const cityBarChartDiv = document.getElementById('cityBarChart');
    if (y > pageHeight - 60) {
        doc.addPage();
        addHeader(doc, pageWidth);
        y = 40;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Distribution by Location', 14, y);
    y += 8;
    
    // Get city data from the bar chart container
    const cityBarItems = cityBarChartDiv.querySelectorAll('.bar-item');
    if (cityBarItems.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        cityBarItems.forEach((item, index) => {
            const cityLabel = item.querySelector('.bar-label')?.textContent || '';
            const cityValue = item.querySelector('.bar-value')?.textContent || '';
            if (cityLabel && cityValue) {
                doc.text(`${index + 1}. ${cityLabel}: ${cityValue} orders`, 20, y);
                y += 6;
                if (y > pageHeight - 20) {
                    doc.addPage();
                    addHeader(doc, pageWidth);
                    y = 40;
                }
            }
        });
        y += 10;
    }

    // --- TABLES (Products, Customers) ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Most Frequently Ordered Products", 14, y);
    y += 8;
    if (typeof productTableData !== 'undefined' && Array.isArray(productTableData)) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        productTableData.forEach(row => {
            const rowText = row.map(cell => String(cell)).join('   ');
            doc.text(rowText, 20, y);
            y += 6;
            if (y > pageHeight - 20) {
                doc.addPage();
                addHeader(doc, pageWidth);
                y = 40;
            }
        });
        y += 10;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Top 5 Customers (Most Orders)", 14, y);
    y += 8;
    if (typeof customerTableData !== 'undefined' && Array.isArray(customerTableData)) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        customerTableData.forEach(row => {
            const rowText = row.map(cell => String(cell)).join('   ');
            doc.text(rowText, 20, y);
            y += 6;
            if (y > pageHeight - 20) {
                doc.addPage();
                addHeader(doc, pageWidth);
                y = 40;
            }
        });
    }
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(doc, i, pageCount, pageWidth, pageHeight);
    }
    doc.save("data_analytics_report.pdf");
});

async function fetchTopCustomersByOrders() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('user_id, total_price');

    if (error) {
        console.error('❌ Error fetching orders:', error.message);
        customerTableData = [];
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
        customerTableData = [];
        return;
    }

    const tbody = document.getElementById('topCustomersTableBody');
    tbody.innerHTML = '';

    customerTableData = [];
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
        customerTableData.push([name, stats.orders, `₱${stats.totalSpent.toFixed(2)}`]);
    });
}
