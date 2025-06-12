// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const signInBtn = document.querySelector('.SignInBtn');
//   if (!signInBtn) {
//     console.error('Sign in button not found.');
//     return;
//   }

//   signInBtn.addEventListener('click', async (e) => {
//     e.preventDefault();
//     await handleLogin();
//   });
// });

// async function handleLogin() {
//   const email = document.getElementById('email').value.trim();
//   const password = document.getElementById('password').value;

//   try {
//     const { data, error } = await supabase
//       .from('user_accounts')
//       .select('*') 
//       .eq('email', email)
//       .single();

//     if (error || !data) {
//       alert('Invalid email or password. Please try again.');
//       return;
//     }

//     if (data.password === password) {
//       alert('Login successful!');
      
      
//       localStorage.setItem('currentUser', JSON.stringify(data));
      
    
//       window.location.href = '../homepage/homepage.html';
//     } else {
//       alert('Incorrect password. Please try again.');
//     }
//   } catch (error) {
//     alert('An error occurred: ' + error.message);
//   }
// }

// document.addEventListener('DOMContentLoaded', () => {
//   const signUpBtn = document.querySelector('.SignUpBtn');

//   if (signUpBtn) {
//     signUpBtn.addEventListener('click', () => {
//       window.location.href = '../accountCreation/account-creation.html';
//     });
//   }
// });


// document.getElementById("guestBtn").addEventListener("click", function () {

//   sessionStorage.setItem("userType", "guest");
//   alert("You are using a guest account.");
//   window.location.href = "../Homepage/homepage.html";
  
// });


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

//     // Detect if admin or customer based on session storage
//     const userType = sessionStorage.getItem('userType');
//     if (!userType) {
//       console.warn('User type missing. Defaulting to customer.');
//       sessionStorage.setItem('userType', 'customer');
//     }

//   } else {
//     console.log('No user logged in (guest mode)');
//     if (userInfo) {
//       userInfo.textContent = 'Welcome, Guest!';
//     }
//     sessionStorage.setItem('userType', 'guest');
//   }

//   // Handle "My Account" button
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

//   // Handle cart redirection based on role
//   const cartBtns = document.querySelectorAll('.CartBtn1, .CartBtn2');
//   cartBtns.forEach((btn) => {
//     btn.addEventListener('click', () => {
//       const userType = sessionStorage.getItem('userType');

//       if (userType === 'guest' || !userType) {
//         alert('You are using a guest account. Please log in to access the cart.');
//         window.location.href = '../accountLogin/account-login.html';
//       } else if (userType === 'admin') {
//         window.location.href = '../CartPage/AdminCartPage.html'; // <-- Admin page
//       } else {
//         window.location.href = '../CartPage/CartPage.html'; // <-- Customer page
//       }
//     });
//   });
// });

import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.querySelector('.SignInBtn');
  const signUpBtn = document.querySelector('.SignUpBtn');
  const guestBtn = document.getElementById('guestBtn');
  const backBtn = document.querySelector('.BackBtn');

  if (signInBtn) {
    signInBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleLogin();
    });
  }

  if (signUpBtn) {
    signUpBtn.addEventListener('click', () => {
      window.location.href = '../accountCreation/account-creation.html';
    });
  }

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      sessionStorage.setItem('userType', 'guest');
      alert('You are using a guest account.');
      window.location.href = '../homepage/homepage.html';
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
});

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert('Missing Information', 'Please enter both email and password.');
    return;
  }

  console.log('Attempting login with:', { email });

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth error:', authError);
      showAlert('Login Failed', authError.message);
      return;
    }

    const user = authData.user;
    const uuid = user?.id;

    if (!user || !uuid) {
      showAlert('Login Failed', 'No user data returned.');
      return;
    }

    localStorage.setItem('authUuid', uuid);
    console.log('Logged in user UUID:', uuid);

    const { data: adminData, error: adminError, status: adminStatus } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('uuid', uuid)
      .maybeSingle();

    if (adminError && adminStatus !== 406) {
      console.error('Admin lookup error:', adminError.message);
    }

    if (adminData) {
      showAlert('Success', 'Login successful as Admin!');
      localStorage.setItem('currentUser', JSON.stringify(adminData));
      sessionStorage.setItem('userType', 'admin');
      window.location.href = '../homepage/homepage.html';
      return;
    }

    const { data: customerData, error: customerError, status: customerStatus } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('uuid', uuid)
      .maybeSingle();

    if (customerError && customerStatus !== 406) {
      console.error('Customer lookup error:', customerError.message);
    }

    if (customerData) {
      showAlert('Success', 'Login successful as Customer!');
      localStorage.setItem('currentUser', JSON.stringify(customerData));
      sessionStorage.setItem('userType', 'customer');
      window.location.href = '../homepage/homepage.html';
      return;
    }

    showAlert('Login Failed', 'User not found in admin or customer tables.');
  } catch (err) {
    console.error('Unexpected login error:', err);
    alert('Unexpected error: ' + err.message);
  }
}
