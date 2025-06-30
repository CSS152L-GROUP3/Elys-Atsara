
import { supabase } from '../supabaseClient/supabase.js';

let allReviews = [];

document.addEventListener('DOMContentLoaded', async () => {
  const reviewTableBody = document.querySelector('#reviewTable tbody');

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading reviews:', error.message);
    reviewTableBody.innerHTML = '<tr><td colspan="6">Failed to load reviews.</td></tr>';
    return;
  }

  const [{ data: products }, { data: customers }, { data: orders }] = await Promise.all([
    supabase.from('products').select('id, name'),
    supabase.from('customer_accounts').select('uuid, name'),
    supabase.from('orders').select('id, orders')
  ]);

  const productMap = Object.fromEntries((products || []).map(p => [p.id, p.name]));
  const customerMap = Object.fromEntries((customers || []).map(c => [c.uuid, c.name]));
  const orderMap = Object.fromEntries((orders || []).map(o => [o.id, o.orders]));

  allReviews = reviews.map((review) => {
    const customerName = customerMap[review.user_id] || 'Unknown User';
    const orderedItems = orderMap[review.order_id] || [];

    const productList = orderedItems.map(item => {
      const productName = productMap[item.product_id] || 'Unknown Product';
      return `${productName} (x${item.quantity})`;
    });

    return {
      ...review,
      customer_name: customerName,
      product_lines: productList.join('\n')  // newline-separated text
    };
  });

  renderTable(allReviews);

  document.getElementById('rating-filter')?.addEventListener('change', applyFilters);
  document.getElementById('product-search')?.addEventListener('input', applyFilters);
  document.getElementById('customer-search')?.addEventListener('input', applyFilters);
  document.getElementById('date-sort')?.addEventListener('change', applyFilters);
});

function renderTable(reviews) {
  const reviewTableBody = document.querySelector('#reviewTable tbody');
  reviewTableBody.innerHTML = '';

  if (reviews.length === 0) {
    reviewTableBody.innerHTML = '<tr><td colspan="6" class="no-reviews">No reviews found.</td></tr>';
    return;
  }

  for (const r of reviews) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="white-space: pre-line;">${r.product_lines}</td>
      <td>${r.customer_name}</td>
      <td>${r.order_id}</td>
      <td>${r.rating}/5</td>
      <td>${r.comment}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    `;
    reviewTableBody.appendChild(row);
  }
}

function applyFilters() {
  const rating = document.getElementById('rating-filter')?.value;
  const productSearch = document.getElementById('product-search')?.value.toLowerCase();
  const customerSearch = document.getElementById('customer-search')?.value.toLowerCase();
  const dateSort = document.getElementById('date-sort')?.value;

  let filtered = allReviews.slice();

  if (rating) {
    filtered = filtered.filter(r => String(r.rating) === rating);
  }

  if (productSearch) {
    filtered = filtered.filter(r => r.product_lines.toLowerCase().includes(productSearch));
  }

  if (customerSearch) {
    filtered = filtered.filter(r => r.customer_name.toLowerCase().includes(customerSearch));
  }

  if (dateSort === 'asc') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (dateSort === 'desc') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  renderTable(filtered);
}
