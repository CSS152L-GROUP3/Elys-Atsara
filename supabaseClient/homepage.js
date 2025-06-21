// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', async () => {
//   const userInfo = document.getElementById('user-info');

//   const { data: { session }, error: sessionError } = await supabase.auth.getSession();

//   if (sessionError || !session?.user) {
//     console.log('No Supabase session found or session error.');
//     localStorage.setItem('userType', 'guest');
//     localStorage.removeItem('currentUser');
//     if (userInfo) userInfo.textContent = 'Welcome, Guest!';
//     return;
//   }

//   const user = session.user;
//   const uuid = user.id;
//   console.log('Supabase Auth User Object:', user);


//   const { data: adminData, error: adminError } = await supabase
//     .from('admin_accounts')
//     .select('*')
//     .eq('uuid', uuid)
//     .maybeSingle();

//   if (adminError) {
//     console.error('Error fetching admin data:', adminError.message);
//   }

//   if (adminData) {
//     console.log('Logged in as ADMIN');
//     console.log('Admin Record:', adminData);
//     localStorage.setItem('userType', 'admin');
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
//     console.log('Logged in as CUSTOMER');
//     console.log('Customer Record:', customerData);
//     localStorage.setItem('userType', 'customer');
//     localStorage.setItem('currentUser', JSON.stringify(customerData));
//     if (userInfo) userInfo.textContent = `Welcome, ${customerData.email}`;
//     return;
//   }

  
//   console.warn('User not found in admin or customer accounts.');
//   localStorage.setItem('userType', 'guest');
//   localStorage.removeItem('currentUser');
//   if (userInfo) userInfo.textContent = 'Welcome, Guest!';
// });


import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const userInfo = document.getElementById('user-info');

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('User not found or error occurred.');
    localStorage.setItem('userType', 'guest');
    localStorage.removeItem('currentUser');
    if (userInfo) userInfo.textContent = 'Welcome, Guest!';
    return;
  }

  const uuid = user.id;
  console.log('Logged in user:', user.email);

  const { data: adminData } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (adminData) {
    console.log('Admin logged in');
    localStorage.setItem('userType', 'admin');
    localStorage.setItem('currentUser', JSON.stringify(adminData));
    if (userInfo) userInfo.textContent = `Welcome, ${adminData.email}`;
    return;
  }

 
  const { data: customerData } = await supabase
    .from('customer_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (customerData) {
    console.log('Customer logged in');
    localStorage.setItem('userType', 'customer');
    localStorage.setItem('currentUser', JSON.stringify(customerData));
    if (userInfo) userInfo.textContent = `Welcome, ${customerData.email}`;
    return;
  }


  console.warn('User not found in admin or customer tables.');
  localStorage.setItem('userType', 'guest');
  localStorage.removeItem('currentUser');
  if (userInfo) userInfo.textContent = 'Welcome, Guest!';
});
