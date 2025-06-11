
// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const userJson = localStorage.getItem('currentUser');
//   const userInfo = document.getElementById('user-info');

//   if (userJson) {
//     const user = JSON.parse(userJson);
//     console.log('User is logged in:', user.email);

//     if (userInfo) {
//       userInfo.textContent = `Welcome, ${user.email}`;
//     }
//   } else {
//     console.log('No user logged in (guest mode)');

//     if (userInfo) {
//       userInfo.textContent = 'Welcome, Guest!';
//     }
//   }


//   const accountBtn = document.querySelector('.AccountBtn2');
//   if (accountBtn) {
//     accountBtn.addEventListener('click', () => {
//       const userJson = localStorage.getItem('currentUser');

//       if (userJson) {
       
//         window.location.href = '../profile/UserProfile.html';
//       } else {
       
//         alert('You must be logged in to view your account.');
//         window.location.href = '../accountLogin/account-login.html';
//       }
//     });
//   }
// });

// window.addEventListener("DOMContentLoaded", () => {
//   const userJson = localStorage.getItem("currentUser");

//   if (!userJson) {
//     console.log("Guest user detected");
//     sessionStorage.setItem("userType", "guest");
//   } else {
//     console.log("Logged-in user detected");
//     sessionStorage.setItem("userType", "user");
//   }
// });


// window.addEventListener("DOMContentLoaded", () => {

//   const userJson = localStorage.getItem("currentUser");

//   if (!userJson) {
//     sessionStorage.setItem("userType", "guest");
//   } else {
//     sessionStorage.setItem("userType", "user");
//   }

  
//   const cartBtns = document.querySelectorAll(".CartBtn1, .CartBtn2");

//   cartBtns.forEach((btn) => {
//     btn.addEventListener("click", () => {
//       const userType = sessionStorage.getItem("userType");

//       if (userType === "guest" || !userType) {
//         alert("You are using a guest account. Please log in to access the cart.");
//         window.location.href = "../accountLogin/account-login.html";
//       } else {
//         window.location.href = "../CartPage/CartPage.html";
//       }
//     });
//   });
// });

import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const userJson = localStorage.getItem('currentUser');
  const userInfo = document.getElementById('user-info');

  if (!userJson) {
    console.log('No user logged in (guest mode)');
    if (userInfo) userInfo.textContent = 'Welcome, Guest!';
    sessionStorage.setItem('userType', 'guest');
    return;
  }

  const session = await supabase.auth.getSession();
  const user = session.data.session?.user;

  if (!user) {
    console.log('No Supabase session found');
    if (userInfo) userInfo.textContent = 'Welcome, Guest!';
    sessionStorage.setItem('userType', 'guest');
    return;
  }

  const uuid = user.id;
  console.log('User is logged in:', user.email);


  const { data: adminData, error: adminError } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle();

  if (adminError) {
    console.error('Error fetching admin data:', adminError.message);
  }

  if (adminData) {
    console.log('Logged in as ADMIN:');
    console.table(adminData);
    sessionStorage.setItem('userType', 'admin');
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
    console.error('Error fetching customer data:', customerError.message);
  }

  if (customerData) {
    console.log('Logged in as CUSTOMER:');
    console.table(customerData); 
    sessionStorage.setItem('userType', 'customer');
    localStorage.setItem('currentUser', JSON.stringify(customerData));
    if (userInfo) userInfo.textContent = `Welcome, ${customerData.email}`;
    return;
  }

  console.log('User not found in either table.');
  if (userInfo) userInfo.textContent = 'Welcome, Guest!';
  sessionStorage.setItem('userType', 'guest');
});


document.addEventListener('DOMContentLoaded', () => {
  const accountBtns = document.querySelectorAll('.AccountBtn1, .AccountBtn2');
  
  accountBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        window.location.href = '../profile/UserProfile.html';
      } else {
        alert('You must be logged in to view your account.');
        window.location.href = '../accountLogin/account-login.html';
      }
    });
  });


  const cartBtns = document.querySelectorAll('.CartBtn1, .CartBtn2');
  cartBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const userType = sessionStorage.getItem('userType');
      if (!userType || userType === 'guest') {
        alert('You are using a guest account. Please log in to access the cart.');
        window.location.href = '../accountLogin/account-login.html';
      } else if (userType === 'admin') {
        window.location.href = '../CartPage/CartPage.html';
      } else {
        window.location.href = '../CartPage/CartPage.html';
      }
    });
  });
});
