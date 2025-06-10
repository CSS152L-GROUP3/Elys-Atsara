import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const userJson = localStorage.getItem('currentUser');

  if (!userJson) {
    console.log('No user logged in');
    window.location.href = '../accountLogin/accountLogin.html';
    return;
  }

  const user = JSON.parse(userJson);
  console.log('Loaded user:', user);

  // Set values in input fields
  const roleInput = document.getElementById('role');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const mobileInput = document.getElementById('mobile_no');
  const passwordInput = document.getElementById('password');

  if (roleInput) roleInput.value = user.role || '';
  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (mobileInput) mobileInput.value = user.mobile_no || '';
  if (passwordInput) passwordInput.value = user.password || ''; 
});


const goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    // Just go back to homepage — no restriction
    window.location.href = '../Homepage/Homepage.html';
  });
}

const logoutBtn = document.getElementById('logout-btn'); 
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
   
    localStorage.removeItem('currentUser');

    alert('You are logged out. You can continue as guest.');
    window.location.href = '../Homepage/Homepage.html';
  });
}
