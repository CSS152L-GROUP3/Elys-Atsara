import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const userJson = localStorage.getItem('currentUser');
  const userType = sessionStorage.getItem('userType'); 

  if (!userJson) {
    console.log('No user logged in');
    window.location.href = '../accountLogin/account-login.html';
    return;
  }

  const user = JSON.parse(userJson);
  console.log('Loaded user:', user);

  
  const roleInput = document.getElementById('role');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const mobileInput = document.getElementById('mobile_no');
  const passwordInput = document.getElementById('password');

  
  if (roleInput) {
    roleInput.value = userType?.toUpperCase() || 'UNKNOWN';
    console.log('Role set to:', roleInput.value);
  }

  if (nameInput) {
    nameInput.value = user.name || '';
    console.log('Name set to:', nameInput.value);
  }

  if (emailInput) {
    emailInput.value = user.email || '';
    console.log('Email set to:', emailInput.value);
  }

  if (mobileInput) {
    mobileInput.value = user.mobile_no || '';
    console.log('Mobile number set to:', mobileInput.value);
  }

  if (passwordInput) {
    passwordInput.value = '••••••••'; // Placeholder
    passwordInput.disabled = true;
    console.log('Password field disabled and set to placeholder.');
  }
});


const goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });
}


const logoutBtn = document.getElementById('logout-btn');
const logoutModal = document.getElementById('logoutModal');
const logoutOkBtn = document.getElementById('logoutOkBtn');
const closeLogoutModal = document.getElementById('closeLogoutModal');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'flex';
  });
}

if (logoutOkBtn) {
  logoutOkBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('userType');
    window.location.href = '../index.html';
  });
}

if (closeLogoutModal) {
  closeLogoutModal.addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'none';
  });
}

window.addEventListener('click', function(event) {
  if (event.target === logoutModal) {
    logoutModal.style.display = 'none';
  }
});


