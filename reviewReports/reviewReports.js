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
    return;
  }

  allReviews = await Promise.all(
    reviews.map(async (review) => {
      const [customerRes, productRes, orderRes] = await Promise.all([
        supabase.from('customer_accounts').select('name').eq('uuid', review.user_id).single(),
        supabase.from('products').select('name, image_url').eq('id', review.product_id).single(),
        supabase.from('orders').select('id').eq('id', review.order_id).single()
      ]);

      return {
        ...review,
        customer_name: customerRes.data?.name || 'Unknown User',
        product_name: productRes.data?.name || 'N/A',
        product_image: productRes.data?.image_url || 'https://via.placeholder.com/50',
        order_id: orderRes.data?.id || 'N/A'
      };
    })
  );

  renderTable(allReviews);

  // Add filter listeners
  document.getElementById('rating-filter')?.addEventListener('change', applyFilters);
  document.getElementById('product-search')?.addEventListener('input', applyFilters);
  document.getElementById('customer-search')?.addEventListener('input', applyFilters);
  document.getElementById('date-sort')?.addEventListener('change', applyFilters);
});

function renderTable(reviews) {
  const reviewTableBody = document.querySelector('#reviewTable tbody');
  reviewTableBody.innerHTML = '';

  if (reviews.length === 0) {
    reviewTableBody.innerHTML = '<tr><td colspan="6">No reviews found.</td></tr>';
    return;
  }

  for (const r of reviews) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <img src="${r.product_image}" alt="Product Image" width="50" height="50"><br>
        ${r.product_name}
      </td>
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
    filtered = filtered.filter(r => r.product_name.toLowerCase().includes(productSearch));
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


console.log('Fetched reviews:', reviews);
console.log('Supabase error:', error);
