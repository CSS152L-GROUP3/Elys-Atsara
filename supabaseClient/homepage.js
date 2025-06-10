
import { supabase } from './supabase.js';

// document.addEventListener('DOMContentLoaded', () => {
//   const userJson = localStorage.getItem('currentUser');

//   if (userJson) {
//     const user = JSON.parse(userJson);
//     console.log('User is logged in:', user.email);

//     const userInfo = document.getElementById('user-info');
//     if (userInfo) {
//       userInfo.textContent = `Welcome, ${user.email}`;
//     }
//   } else {
//     console.log('No user logged in');
//     window.location.href = '../accountLogin/accountLogin.html';
//   }
// });


document.addEventListener('DOMContentLoaded', () => {
  const userJson = localStorage.getItem('currentUser');
  const userInfo = document.getElementById('user-info');

  if (userJson) {
    const user = JSON.parse(userJson);
    console.log('User is logged in:', user.email);

    if (userInfo) {
      userInfo.textContent = `Welcome, ${user.email}`;
    }
  } else {
    console.log('No user logged in (guest mode)');

    if (userInfo) {
      userInfo.textContent = 'Welcome, Guest!';
    }
  }

  // ✅ Account button click
  const accountBtn = document.querySelector('.AccountBtn2');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      const userJson = localStorage.getItem('currentUser');

      if (userJson) {
        // User is logged in, go to profile
        window.location.href = '../profile/UserProfile.html';
      } else {
        // Not logged in, block or show message
        alert('You must be logged in to view your account.');
      }
    });
  }
});


