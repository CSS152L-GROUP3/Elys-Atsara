
// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const signupForm = document.getElementById('signupForm');
//   if (!signupForm) return;

//   signupForm.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const name = signupForm.name.value.trim();
//     const email = signupForm.email.value.trim();
//     const password = signupForm.password.value.trim(); // optional: trim for consistency
//     const mobile_no = signupForm.mobile_no.value.trim();
//     const role = signupForm.role.value;

//   
//     if (!name || !email || !password || !mobile_no || !role) {
//       alert('All fields are required.');
//       return;
//     }

// 
//     const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];
//     const emailParts = email.split('@');
//     if (
//       emailParts.length !== 2 ||
//       !allowedDomains.includes(emailParts[1])
//     ) {
//       alert('Please enter a valid email address (e.g., gmail.com, yahoo.com, outlook.com).');
//       return;
//     }

//    
//     const mobilePattern = /^09\d{9}$/;
//     if (!mobilePattern.test(mobile_no)) {
//       alert('Please enter a valid 11-digit mobile number starting with 09 (e.g., 09123456789).');
//       return;
//     }

//     try {
//  
//       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           emailRedirectTo: 'http://127.0.0.1:5500/Verify/verify.html', // 
//           data: {
//             name,
//             mobile_no,
//             role,
//             password 
//           }
//         }
//       });

//    
//       if (signUpError) {
//         if (signUpError.message.includes('User already registered')) {
//           alert('Email already registered. Please log in.');
//           window.location.href = '../accountLogin/account-login.html';
//         } else {
//           alert('Signup failed: ' + signUpError.message);
//           console.error(signUpError);
//         }
//         return;
//       }


//       alert('Signup successful! A confirmation email has been sent to your inbox. Please verify your email before logging in.');
//       window.location.href = '../accountLogin/account-login.html';

//     } catch (err) {
//       alert('Unexpected error: ' + err.message);
//       console.error(err);
//     }
//   });
// });

import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = signupForm.name.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value.trim(); // for testing
    const mobile_no = signupForm.mobile_no.value.trim();
    const role = signupForm.role.value;

    
    if (!name || !email || !password || !mobile_no || !role) {
      alert('All fields are required.');
      return;
    }

  
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    const emailParts = email.split('@');
    if (
      emailParts.length !== 2 ||
      !allowedDomains.includes(emailParts[1])
    ) {
      alert('Please enter a valid email address (e.g., gmail.com, yahoo.com, outlook.com).');
      return;
    }

    const mobilePattern = /^09\d{9}$/;
    if (!mobilePattern.test(mobile_no)) {
      alert('Please enter a valid 11-digit mobile number starting with 09 (e.g., 09123456789).');
      return;
    }

    try {
    
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://127.0.0.1:5500/Verify/verify.html', 
          data: {
            name,
            mobile_no,
            role,
            password 
          }
        }
      });

     
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          alert('Email already registered. Please log in.');
          window.location.href = '../accountLogin/account-login.html';
        } else {
          alert('Signup failed: ' + signUpError.message);
          console.error(signUpError);
        }
        return;
      }

    
      alert('Signup successful! A confirmation email has been sent. Please verify your email before logging in.');
      window.location.href = '../accountLogin/account-login.html';

    } catch (err) {
      alert('Unexpected error: ' + err.message);
      console.error(err);
    }
  });
});
