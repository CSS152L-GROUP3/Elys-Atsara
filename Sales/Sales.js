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
        const totalSales = orders.reduce((sum, order) => sum + order.total_price, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalSales / totalOrders;

        document.getElementById("totalSalesValue").textContent = `₱${totalSales.toFixed(2)}`;
        document.getElementById("totalOrdersValue").textContent = totalOrders;
        document.getElementById("averageOrderValue").textContent = `₱${avgOrderValue.toFixed(2)}`;

        // === AOV TREND VS LAST MONTH ===
        const lastMonthStart = new Date(year, month - 1, 1).toISOString();
        const lastMonthEnd = new Date(year, month, 0).toISOString();

        const { data: lastMonthOrders } = await supabase
            .from("orders")
            .select("total_price")
            .gte("created_at", lastMonthStart)
            .lte("created_at", lastMonthEnd);


        if (lastMonthOrders.length > 0) {
            const lastTotal = lastMonthOrders.reduce((sum, o) => sum + o.total_price, 0);
            lastAvg = lastTotal / lastMonthOrders.length; // ✅ Remove `const` here
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
        chartEl.style.height = "100%"; // Let container control the height
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
                ${avgOrderValue.toFixed(2)}
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



    } catch (err) {
        console.error("Failed to load sales report:", err.message);
    }
})();
