// salesReport.js
import { supabase } from '../supabaseClient/supabase.js';

// === SALES REPORT SCRIPT ===

// Utility: Get YYYY-MM from Date object
function formatYearMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Get current month
const today = new Date();
const currentMonth = formatYearMonth(today);

// === MAIN FUNCTION ===
(async function generateSalesReport() {
    // Define topCustomers as empty array for scope
    let topCustomers = [];
    let totalSales = 0;
    let totalOrders = 0;
    let avgOrderValue = 0;
    let lastAvg = 0;

    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const firstDay = new Date(Date.UTC(year, month, 1)).toISOString();
        const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error("No Supabase session found or session error.");
            return;
        }

        const { data: orders, error } = await supabase
            .from("orders")
            .select("id, total_price, user_id, payment_method, created_at, orders, address_id")
            .gte("created_at", firstDay)
            .lte("created_at", lastDay);

        console.log("Orders for month:", orders); // ✅ Debug here

        if (error) throw error;
        if (!orders || orders.length === 0) return;

        // === TOTAL METRICS ===
        totalSales = orders.reduce((sum, order) => sum + order.total_price, 0);
        totalOrders = orders.length;
        avgOrderValue = totalSales / totalOrders;

        document.getElementById("totalSalesValue").textContent = `₱${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById("totalOrdersValue").textContent = totalOrders.toLocaleString();
        document.getElementById("averageOrderValue").textContent = `₱${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // === AOV TREND VS LAST MONTH ===
        let lastAvg;
        const lastMonthStart = new Date(year, month - 1, 1).toISOString();
        const lastMonthEnd = new Date(year, month, 0).toISOString();

        const { data: lastMonthOrders } = await supabase
            .from("orders")
            .select("total_price")
            .gte("created_at", lastMonthStart)
            .lte("created_at", lastMonthEnd);

        if (lastMonthOrders.length > 0) {
            const lastTotal = lastMonthOrders.reduce((sum, o) => sum + o.total_price, 0);
            lastAvg = lastTotal / lastMonthOrders.length;
            const diff = avgOrderValue - lastAvg;
            const percent = ((diff / lastAvg) * 100).toFixed(1);
            const trendElement = document.getElementById("aovTrend");

            if (diff > 0) {
                trendElement.classList.add("up");
                trendElement.textContent = `▲ +${percent}% from last month`;
            } else if (diff < 0) {
                trendElement.classList.add("down");
                trendElement.textContent = `▼ ${percent}% from last month`;
            } else {
                trendElement.textContent = `No change from last month`;
            }
        }

        // ─────────────────────────────────────────
        // 📈 SALES TREND (LINE)
        const salesPerDay = {};
        orders.forEach(order => {
            const date = new Date(order.created_at).toISOString().slice(0, 10);
            salesPerDay[date] = (salesPerDay[date] || 0) + order.total_price;
        });

        const sortedDates = Object.keys(salesPerDay).sort();
        const salesData = sortedDates.map(date => salesPerDay[date]);

        new Chart(document.getElementById("salesTrendChart"), {
            type: "line",
            data: {
                labels: sortedDates,
                datasets: [{
                    label: "Daily Sales",
                    data: salesData,
                    backgroundColor: "rgba(0, 123, 255, 0.2)",
                    borderColor: "#007bff",
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            }
        });

        // 📊 ORDERS TREND (BAR)
        const ordersPerDay = {};
        orders.forEach(order => {
            const date = new Date(order.created_at).toISOString().slice(0, 10);
            ordersPerDay[date] = (ordersPerDay[date] || 0) + 1;
        });

        const barData = Object.keys(ordersPerDay).sort().map(date => ordersPerDay[date]);

        new Chart(document.getElementById("ordersBarChart"), {
            type: "bar",
            data: {
                labels: Object.keys(ordersPerDay).sort(),
                datasets: [{
                    label: "Orders per Day",
                    data: barData,
                    backgroundColor: "#28a745"
                }]
            }
        });

        // ─────────────────────────────────────────
        // 💳 PAYMENT METHOD (DOUGHNUT)
        const methodCounts = {};
        orders.forEach(order => {
            methodCounts[order.payment_method] = (methodCounts[order.payment_method] || 0) + 1;
        });

        new Chart(document.getElementById("paymentChart"), {
            type: "doughnut",
            data: {
                labels: Object.keys(methodCounts),
                datasets: [{
                    data: Object.values(methodCounts),
                    backgroundColor: ["#007bff", "#ffc107", "#28a745", "#dc3545"]
                }]
            }
        });

        // ─────────────────────────────────────────
        // 📍 ORDER BY CITY (STACKED BAR) - USE address_id FK
        // 1. Get all address_ids from orders
        const addressIds = [...new Set(orders.map(order => order.address_id).filter(Boolean))];
        // Debug: Log all addressIds from orders
        console.log('Order addressIds:', addressIds);
        // 2. Fetch all addresses in one query
        const { data: addressRows } = await supabase
            .from("customer_addresses")
            .select("id, city")
            .in("id", addressIds);
        // Debug: Log fetched addressRows
        console.log('Fetched addressRows:', addressRows);
        // 3. Map address_id to city
        const addressIdToCity = {};
        if (Array.isArray(addressRows)) {
            addressRows.forEach(row => {
                addressIdToCity[row.id] = row.city || "Unknown";
            });
        }
        // Debug: Log addressIdToCity mapping
        console.log('addressIdToCity mapping:', addressIdToCity);
        // 4. Collect all payment methods dynamically
        const allMethods = [...new Set(orders.map(o => o.payment_method))];
        // 5. Build cityStats
        const cityStats = {};
        orders.forEach(order => {
            // Debug: Log each order's address_id and resolved city
            const city = addressIdToCity[order.address_id] || "Unknown";
            console.log(`Order ${order.id} address_id: ${order.address_id}, resolved city: ${city}`);
            if (!cityStats[city]) {
                cityStats[city] = {};
                allMethods.forEach(method => cityStats[city][method] = 0);
            }
            cityStats[city][order.payment_method] = (cityStats[city][order.payment_method] || 0) + 1;
        });
        const cities = Object.keys(cityStats);
        // Build datasets dynamically
        const cityDatasets = allMethods.map((method, idx) => ({
            label: method.charAt(0).toUpperCase() + method.slice(1),
            data: cities.map(city => cityStats[city][method] || 0),
            backgroundColor: ["#6c757d", "#17a2b8", "#5DE2E7", "#6610f2", "#ffc107", "#dc3545"][idx % 6]
        }));
        new Chart(document.getElementById("cityStackedBarChart"), {
            type: "bar",
            data: {
                labels: cities,
                datasets: cityDatasets
            },
            options: {
                plugins: { title: { display: true, text: "Orders by City and Method" } },
                responsive: true,
                scales: { x: { stacked: true }, y: { stacked: true } }
            }
        });

        // 🛍️ TOP PRODUCTS SOLD (HORIZONTAL BAR) - SHOW TRUNCATED DESCRIPTIONS & IMPROVED LAYOUT
        // Set canvas height BEFORE creating the chart
        const chartEl = document.getElementById("topProductsChart");
        chartEl.style.height = "300px"; // Ensure the chart has a fixed height for proper rendering
        const productSales = {};
        for (const order of orders) {
            if (Array.isArray(order.orders)) {
                order.orders.forEach(item => {
                    const productId = item.product_id;
                    productSales[productId] = (productSales[productId] || 0) + item.quantity;
                });
            }
        }
        const sortedProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        if (sortedProducts.length > 0) {
            // Fetch product descriptions for top products
            const topProductIds = sortedProducts.map(p => p[0]);
            const { data: productRows } = await supabase
                .from("products")
                .select("id, description")
                .in("id", topProductIds);
            const idToDescription = {};
            if (Array.isArray(productRows)) {
                productRows.forEach(row => { idToDescription[row.id] = row.description; });
            }
            // Truncate long descriptions for chart labels
            function truncate(str, n) {
                return (str && str.length > n) ? str.slice(0, n - 1) + '…' : str;
            }
            new Chart(document.getElementById("topProductsChart"), {
                type: "bar",
                data: {
                    labels: sortedProducts.map(p => truncate(idToDescription[p[0]], 30) || p[0]),
                    datasets: [{
                        label: "Units Sold",
                        data: sortedProducts.map(p => p[1]),
                        backgroundColor: "#fd7e14"
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { left: 40, right: 20, top: 20, bottom: 20 }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        y: {
                            ticks: {
                                font: { size: 14 },
                                maxWidth: 200,
                            }
                        }
                    }
                }

            });
        } else {
            console.log("No top products data available.");
        }

        // === CREATIVE AOV DESIGN ===
        // Add icon and subtitle to AOV display
        const aovElem = document.getElementById("averageOrderValue");
        if (aovElem) {
            aovElem.innerHTML = `<span style='font-size:2.5rem; color:#B3261E; display:flex; align-items:center; justify-content:center; gap:10px;'>
                <svg width='32' height='32' fill='none' viewBox='0 0 24 24' style='vertical-align:middle;'><circle cx='12' cy='12' r='12' fill='#fd7e14'/><text x='12' y='17' text-anchor='middle' font-size='14' fill='white' font-family='Arial' font-weight='bold'>₱</text></svg>
                ${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style='font-size:1rem; color:#555; font-weight:500;'>Avg. Order Value</span>`;
        }

        const aovChartEl = document.getElementById("aovChart");
        if (aovChartEl) {
            new Chart(aovChartEl, {
                type: "bar",
                data: {
                    labels: ["Last Month", "This Month"],
                    datasets: [{
                        label: "AOV",
                        data: [lastAvg, avgOrderValue],
                        backgroundColor: ["#6c757d", "#fd7e14"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // === TOP CUSTOMERS ===
        // Calculate topCustomers array here (if not already in your code)
        // Example placeholder:
        // topCustomers = [
        //   { name: 'Customer A', totalOrders: 3, totalSpent: 1000, lastOrder: '2024-06-01' },
        //   ...
        // ];
        // TODO: Populate topCustomers with real data from orders

    } catch (err) {
        console.error("Failed to load sales report:", err.message);
    }

    // Move export event listeners here so they have access to the variables
    document.getElementById("exportCSV").addEventListener("click", () => {
        // Create comprehensive CSV content
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // === REPORT HEADER ===
        csvContent += "ELY'S ATSARA - SALES REPORT\n";
        csvContent += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
        csvContent += `Reporting Period: ${document.getElementById("monthSelector")?.value || "Current Month"}\n\n`;

        // === SUMMARY METRICS ===
        csvContent += "SUMMARY METRICS\n";
        csvContent += "Metric,Value\n";
        csvContent += `Total Sales,₱${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        csvContent += `Total Orders,${totalOrders.toLocaleString()}\n`;
        csvContent += `Average Order Value,₱${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        csvContent += `Last Month AOV,₱${lastAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        csvContent += `AOV Change,${((avgOrderValue - lastAvg) / lastAvg * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%\n\n`;

        // === DAILY SALES BREAKDOWN ===
        if (typeof salesPerDay !== 'undefined') {
            csvContent += "DAILY SALES BREAKDOWN\n";
            csvContent += "Date,Sales (₱),Orders,Average Daily Order Value\n";
            Object.keys(salesPerDay).sort().forEach(date => {
                const dailyOrders = ordersPerDay[date] || 0;
                const dailyAvg = dailyOrders > 0 ? (salesPerDay[date] / dailyOrders).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                csvContent += `${date},${salesPerDay[date].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${dailyOrders.toLocaleString()},₱${dailyAvg}\n`;
            });
            csvContent += "\n";
        }

        // === PAYMENT METHOD ANALYSIS ===
        if (typeof methodCounts !== 'undefined') {
            csvContent += "PAYMENT METHOD ANALYSIS\n";
            csvContent += "Payment Method,Orders,Percentage of Total Orders\n";
            const totalOrderCount = Object.values(methodCounts).reduce((sum, count) => sum + count, 0);
            Object.entries(methodCounts).forEach(([method, count]) => {
                const percentage = ((count / totalOrderCount) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 });
                csvContent += `${method},${count.toLocaleString()},${percentage}%\n`;
            });
            csvContent += "\n";
        }

        // === CITY ANALYSIS ===
        if (typeof cityStats !== 'undefined') {
            csvContent += "CITY ANALYSIS\n";
            csvContent += "City,Total Orders,Payment Methods\n";
            Object.entries(cityStats).forEach(([city, methods]) => {
                const totalCityOrders = Object.values(methods).reduce((sum, count) => sum + count, 0);
                const methodBreakdown = Object.entries(methods)
                    .filter(([method, count]) => count > 0)
                    .map(([method, count]) => `${method}:${count.toLocaleString()}`)
                    .join('; ');
                csvContent += `${city},${totalCityOrders.toLocaleString()},"${methodBreakdown}"\n`;
            });
            csvContent += "\n";
        }

        // === TOP PRODUCTS ANALYSIS ===
        if (typeof sortedProducts !== 'undefined' && sortedProducts.length > 0) {
            csvContent += "TOP PRODUCTS ANALYSIS\n";
            csvContent += "Rank,Product ID,Units Sold,Product Description\n";
            sortedProducts.forEach((product, index) => {
                const rank = index + 1;
                const productId = product[0];
                const unitsSold = product[1];
                // Try to get product description if available
                const description = idToDescription && idToDescription[productId]
                    ? idToDescription[productId].replace(/"/g, '""') // Escape quotes for CSV
                    : 'N/A';
                csvContent += `${rank},${productId},${unitsSold.toLocaleString()},"${description}"\n`;
            });
            csvContent += "\n";
        }

        // === ORDER DETAILS (if orders data is available) ===
        if (typeof orders !== 'undefined' && orders.length > 0) {
            csvContent += "DETAILED ORDER DATA\n";
            csvContent += "Order ID,Date,Time,Total Price (₱),Payment Method,Address ID,Items Count\n";
            orders.forEach(order => {
                const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
                const orderTime = new Date(order.created_at).toLocaleTimeString();
                const itemsCount = Array.isArray(order.orders) ? order.orders.length : 0;
                csvContent += `${order.id},${orderDate},${orderTime},${order.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${order.payment_method},${order.address_id || 'N/A'},${itemsCount.toLocaleString()}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    document.getElementById("exportPDF").addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- HEADER TEMPLATE ---
        function addHeader(doc, pageWidth) {
            // Add logo image
            try {
                const logoImg = new Image();
                logoImg.src = 'Group 7.png';
                doc.addImage(logoImg, 'PNG', 14, 8, 30, 30);
            } catch (error) {
                // Fallback to placeholder if logo fails to load
                doc.setFillColor(230, 230, 230);
                doc.rect(14, 8, 30, 30, 'F');
            }
            
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text("Sales Report", pageWidth / 2, 25, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Prepared by: Ely's Atsara`, pageWidth - 14, 15, { align: 'right' });
            doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 25, { align: 'right' });
            doc.setDrawColor(180);
            doc.line(14, 40, pageWidth - 14, 40); // horizontal line
        }

        // --- FOOTER TEMPLATE (pagination) ---
        function addFooter(doc, pageNumber, totalPages, pageWidth, pageHeight) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // --- MAIN PDF CONTENT ---
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        addHeader(doc, pageWidth);
        let y = 50;

        // --- STYLISH SUMMARY METRICS SECTION ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text("SALES SUMMARY", 14, y);
        y += 12;

        // Create a styled metrics box
        const metricsBoxY = y;
        const metricsBoxHeight = 60;

        // Draw background box for metrics
        doc.setFillColor(248, 249, 250);
        doc.rect(14, y, pageWidth - 28, metricsBoxHeight, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(14, y, pageWidth - 28, metricsBoxHeight, 'S');

        y += 8;

        // Month indicator
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(108, 117, 125);
        doc.text("REPORTING PERIOD:", 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text(`${document.getElementById("monthSelector")?.value || "Current Month"}`, 70, y);
        y += 12;

        // Total Sales
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 167, 69);
        doc.text("TOTAL SALES:", 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text(`₱${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 70, y);
        y += 12;

        // Total Orders
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text("TOTAL ORDERS:", 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text(`${totalOrders.toLocaleString()}`, 70, y);
        y += 12;

        // Average Order Value
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(253, 126, 20);
        doc.text("AVERAGE ORDER VALUE:", 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 51, 51);
        doc.text(`₱${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 70, y);

        y = metricsBoxY + metricsBoxHeight + 20;

        // --- CHARTS AS IMAGES WITH HEADERS ---
        const chartConfigs = [
            { id: "salesTrendChart", title: "Daily Sales Trend", height: 70, width: 160 },
            { id: "ordersBarChart", title: "Daily Orders Count", height: 70, width: 160 },
            { id: "paymentChart", title: "Payment Method Distribution", height: 95, width: 120 },
            { id: "cityStackedBarChart", title: "Orders by City and Payment Method", height: 75, width: 130 },
            { id: "topProductsChart", title: "Top Products Sold", height: 85, width: 130 }
        ];

        for (const config of chartConfigs) {
            const canvas = document.getElementById(config.id);
            if (canvas) {
                // Check if we need a new page
                if (y > pageHeight - (config.height + 30)) {
                    doc.addPage();
                    addHeader(doc, pageWidth);
                    y = 50;
                }

                // Add chart title
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(config.title, 14, y);
                y += 8;

                // Add chart image with aspect ratio preserved
                const imgData = canvas.toDataURL("image/png", 1.0);
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const maxWidth = config.width; // Use the config width as the max width
                const scale = maxWidth / canvasWidth;
                const pdfWidth = canvasWidth * scale;
                const pdfHeight = canvasHeight * scale;
                const chartX = (pageWidth - pdfWidth) / 2; // Center the chart
                doc.addImage(imgData, "PNG", chartX, y, pdfWidth, pdfHeight);
                y += pdfHeight + 12;
            }
        }

        // --- PAGINATION (after all pages are added) ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            addFooter(doc, i, pageCount, pageWidth, pageHeight);
        }

        doc.save("sales_report.pdf");
    });

})();
