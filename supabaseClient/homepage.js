// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', async () => {
//   const userJson = localStorage.getItem('currentUser');
//   const userInfo = document.getElementById('user-info');

//   if (!userJson) {
//     console.log('No user logged in (guest mode)');
//     if (userInfo) userInfo.textContent = 'Welcome, Guest!';
//     sessionStorage.setItem('userType', 'guest');
//     return;
//   }

//   const session = await supabase.auth.getSession();
//   const user = session.data.session?.user;

//   if (!user) {
//     console.log('No Supabase session found');
//     if (userInfo) userInfo.textContent = 'Welcome, Guest!';
//     sessionStorage.setItem('userType', 'guest');
//     return;
//   }

//   const uuid = user.id;
//   console.log('User is logged in:', user.email);


//   const { data: adminData, error: adminError } = await supabase
//     .from('admin_accounts')
//     .select('*')
//     .eq('uuid', uuid)
//     .maybeSingle();

//   if (adminError) {
//     console.error('Error fetching admin data:', adminError.message);
//   }

//   if (adminData) {
//     console.log('Logged in as ADMIN:');
//     console.table(adminData);
//     sessionStorage.setItem('userType', 'admin');
//     localStorage.setItem('currentUser', JSON.stringify(adminData));
//     if (userInfo) userInfo.textContent = `Welcome, ${adminData.email}`;
//     return;
//   }

  
//   const { data: customerData, error: customerError } = await supabase
//     .from('customer_accounts')
//     .select('*')
//     .eq('uuid', uuid)
//     .maybeSingle();

//   if (customerError) {
//     console.error('Error fetching customer data:', customerError.message);
//   }

//   if (customerData) {
//     console.log('Logged in as CUSTOMER:');
//     console.table(customerData); 
//     sessionStorage.setItem('userType', 'customer');
//     localStorage.setItem('currentUser', JSON.stringify(customerData));
//     if (userInfo) userInfo.textContent = `Welcome, ${customerData.email}`;
//     return;
//   }

//   console.log('User not found in either table.');
//   if (userInfo) userInfo.textContent = 'Welcome, Guest!';
//   sessionStorage.setItem('userType', 'guest');
// });

import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const userInfo = document.getElementById('user-info');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    console.log('No Supabase session found or session error.');
    localStorage.setItem('userType', 'guest');
    localStorage.removeItem('currentUser');
    if (userInfo) userInfo.textContent = 'Welcome, Guest!';
    return;
  }

  const user = session.user;
  const uuid = user.id;
  console.log('👤 Supabase Auth User Object:', user);


  const { data: adminData, error: adminError } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (adminError) {
    console.error('Error fetching admin data:', adminError.message);
  }

  if (adminData) {
    console.log('Logged in as ADMIN');
    console.log('Admin Record:', adminData);
    localStorage.setItem('userType', 'admin');
    localStorage.setItem('currentUser', JSON.stringify(adminData));
    if (userInfo) userInfo.textContent = `Welcome, ${adminData.email}`;
    return;
  }

 
  const { data: customerData, error: customerError } = await supabase
    .from('customer_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (customerError) {
    console.error('⚠️ Error fetching customer data:', customerError.message);
  }

  if (customerData) {
    console.log('Logged in as CUSTOMER');
    console.log('Customer Record:', customerData);
    localStorage.setItem('userType', 'customer');
    localStorage.setItem('currentUser', JSON.stringify(customerData));
    if (userInfo) userInfo.textContent = `Welcome, ${customerData.email}`;
    return;
  }

  
  console.warn('User not found in admin or customer accounts.');
  localStorage.setItem('userType', 'guest');
  localStorage.removeItem('currentUser');
  if (userInfo) userInfo.textContent = 'Welcome, Guest!';
});
