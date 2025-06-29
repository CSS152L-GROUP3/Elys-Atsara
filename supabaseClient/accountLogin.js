// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const signInBtn = document.querySelector('.SignInBtn');
//   const signUpBtn = document.querySelector('.SignUpBtn');
//   const guestBtn = document.getElementById('guestBtn');
//   const backBtn = document.querySelector('.BackBtn');

//   if (signInBtn) {
//     signInBtn.addEventListener('click', async (e) => {
//       e.preventDefault();
//       await handleLogin();
//     });
//   }

//   if (signUpBtn) {
//     signUpBtn.addEventListener('click', () => {
//       window.location.href = '../accountCreation/account-creation.html';
//     });
//   }

//   if (guestBtn) {
//     guestBtn.addEventListener('click', () => {
//       sessionStorage.setItem('userType', 'guest');
//       showAlert('Guest Account', 'You are using a guest account.');
//       // Wait for user to confirm before redirecting
//       const confirmBtn = document.getElementById('alertConfirmBtn');
//       const handler = () => {
//         window.location.href = '../homepage/homepage.html';
//         confirmBtn.removeEventListener('click', handler);
//       };
//       confirmBtn.addEventListener('click', handler);
//     });
//   }

//   if (backBtn) {
//     backBtn.addEventListener('click', () => {
//       window.history.back();
//     });
//   }
// });

// async function handleLogin() {
//   const email = document.getElementById('email').value.trim();
//   const password = document.getElementById('password').value;

//   if (!email || !password) {
//     showAlert('Missing Information', 'Please enter both email and password.');
//     return;
//   }

//   console.log('Attempting login with:', { email });

//   try {
//     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (authError) {
//       console.error('Auth error:', authError);
//       showAlert('Login Failed', authError.message);
//       return;
//     }

//     const user = authData.user;
//     const uuid = user?.id;

//     if (!user || !uuid) {
//       showAlert('Login Failed', 'No user data returned.');
//       return;
//     }

//     localStorage.setItem('authUuid', uuid);
//     console.log('Logged in user UUID:', uuid);

//     const { data: adminData, error: adminError, status: adminStatus } = await supabase
//       .from('admin_accounts')
//       .select('*')
//       .eq('uuid', uuid)
//       .maybeSingle();

//     if (adminError && adminStatus !== 406) {
//       console.error('Admin lookup error:', adminError.message);
//     }

//     if (adminData) {
//       showAlert('Success', 'Login successful as Admin!');
//       localStorage.setItem('currentUser', JSON.stringify(adminData));
//       sessionStorage.setItem('userType', 'admin');
//       window.location.href = '../homepage/homepage.html';
//       return;
//     }

//     const { data: customerData, error: customerError, status: customerStatus } = await supabase
//       .from('customer_accounts')
//       .select('*')
//       .eq('uuid', uuid)
//       .maybeSingle();

//     if (customerError && customerStatus !== 406) {
//       console.error('Customer lookup error:', customerError.message);
//     }

//     if (customerData) {
//       showAlert('Success', 'Login successful as Customer!');
//       localStorage.setItem('currentUser', JSON.stringify(customerData));
//       sessionStorage.setItem('userType', 'customer');
//       window.location.href = '../homepage/homepage.html';
//       return;
//     }

//     showAlert('Login Failed', 'User not found in admin or customer tables.');
//   } catch (err) {
//     console.error('Unexpected login error:', err);
//     alert('Unexpected error: ' + err.message);
//   }
// }

// const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

// if (forgotPasswordBtn) {
//   forgotPasswordBtn.addEventListener('click', async () => {
//     const email = document.getElementById('email').value.trim();

//     if (!email) {
//       showAlert('Missing Email', 'Please enter your email address to reset your password.');
//       return;
//     }

//     try {
//       const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: 'http://127.0.0.1:5500/forgotPassword/forgotPassword.html'  
//       });

//       if (error) {
//         showAlert('Error', error.message);
//       } else {
//         showAlert('Success', `Password reset email sent to ${email}. Please check your inbox.`);
//       }
//     } catch (err) {
//       showAlert('Error', 'Failed to send reset email. Please try again later.');
//       console.error('Reset password error:', err);
//     }
//   });
// }

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
      showAlert('Guest Account', 'You are using a guest account.');
      const confirmBtn = document.getElementById('alertConfirmBtn');
      const handler = () => {
        window.location.href = '../homepage/homepage.html';
        confirmBtn.removeEventListener('click', handler);
      };
      confirmBtn.addEventListener('click', handler);
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
      const role = adminData.role?.toLowerCase() || 'admin';
      showAlert('Success', `Login successful as ${role.charAt(0).toUpperCase() + role.slice(1)}!`);
      localStorage.setItem('currentUser', JSON.stringify(adminData));
      sessionStorage.setItem('userType', role);

     
      if (role === 'superadmin') {
        // window.location.href = '../AdminDashboard/Dashboard.html';
         window.location.href = '../adminManagement/adminManagement.html';
      } else {
        window.location.href = '../homepage/homepage.html';
      }

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

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();

    if (!email) {
      showAlert('Missing Email', 'Please enter your email address to reset your password.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://127.0.0.1:5500/forgotPassword/forgotPassword.html',
      });

      if (error) {
        showAlert('Error', error.message);
      } else {
        showAlert('Success', `Password reset email sent to ${email}. Please check your inbox.`);
      }
    } catch (err) {
      showAlert('Error', 'Failed to send reset email. Please try again later.');
      console.error('Reset password error:', err);
    }
  });
}
