// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const signupForm = document.getElementById('signupForm');

//   if (!signupForm) return;

//   signupForm.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const name = signupForm.name.value.trim();
//     const email = signupForm.email.value.trim();
//     const password = signupForm.password.value;
//     const mobile_no = signupForm.mobile_no.value.trim();
//     const role = signupForm.role.value;

//     if (!email || !password || !name || !mobile_no || !role) {
//       alert('All fields are required.');
//       return;
//     }

//     console.log({ name, email, password, mobile_no, role });

//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: {
//           name,
//           mobile_no,
//           role,
//         },
//          emailRedirectTo: 'http://127.0.0.1:5500/accountLogin/account-login.html'
//       },
//     });

//     if (error) {
//       alert('Signup failed: ' + error.message);
//       console.error(error);
//     } else {
//       alert('Signup successful! Please log in.');
//       window.location.href = '../accountLogin/account-login.html';
//     }
//   });
// });

// import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const signupForm = document.getElementById('signupForm');

//   if (!signupForm) return;

//   signupForm.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const name = signupForm.name.value.trim();
//     const email = signupForm.email.value.trim();
//     const password = signupForm.password.value;
//     const mobile_no = signupForm.mobile_no.value.trim();
//     const role = signupForm.role.value;

//     console.log('Name:', name);
//     console.log('Email:', email);
//     console.log('Password:', password);  
//     console.log('Mobile No:', mobile_no);
//     console.log('Role:', role);

//     if (!email || !password || !name || !mobile_no || !role) {
//       alert('All fields are required.');
//       return;
//     }

//     try {
     
//       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           data: { name, mobile_no, role, password },
//           emailRedirectTo: 'http://127.0.0.1:5500/accountLogin/account-login.html'
//         }
//       });

//       if (signUpError) {
//         alert('Signup failed: ' + signUpError.message);
//         console.error(signUpError);
//         return;
//       }

//       const uuid = signUpData?.user?.id;
//       if (!uuid) {
//         alert('Signup successful, but no user ID returned.');
//         return;
//       }

//       console.log('User UUID from Auth:', uuid);

     
//       const targetTable = role === 'admin' ? 'admin_accounts' : 'customer_accounts';

     
//       const { error: insertError } = await supabase
//         .from(targetTable)
//         .insert([
//           {
//             uuid,
//             name,
//             email,
//             mobile_no,
//             role, 
//             password
//           }
//         ]);

//       if (insertError) {
//        if (insertError.message.includes('duplicate key value')) {
//           alert('You already have an account. Please log in instead.');
//         } else {
//           alert('Signup succeeded, but we couldn’t save your details. Please try again.');
//         }
//         console.error(insertError);
//         return;
//       }


//       alert('Signup successful! Please check your email to verify your account.');
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
    const password = signupForm.password.value;
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
          data: { name, mobile_no, role }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          alert('Email already registered. Please log in.');
          window.location.href = '../accountLogin/account-login.html';
        } else {
          alert('Signup failed: ' + signUpError.message);
        }
        return;
      }

      const uuid = signUpData.user?.id;
      if (!uuid) {
        alert('Signup succeeded, but no user ID returned.');
        return;
      }

      const targetTable = role === 'admin' ? 'admin_accounts' : 'customer_accounts';

      const { error: upsertError } = await supabase
        .from(targetTable)
        .upsert(
          [{ uuid, name, email, mobile_no, role, password }],
          { onConflict: 'uuid' }
        );

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        alert('Signup succeeded, but saving your details failed. Please try again.');
        return;
      }

      alert('Signup successful! Please check your email to verify your account.');
      window.location.href = '../accountLogin/account-login.html';

    } catch (err) {
      alert('Unexpected error: ' + err.message);
      console.error(err);
    }
  });
});
