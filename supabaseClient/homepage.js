
import { supabase } from './supabase.js';

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


  const accountBtn = document.querySelector('.AccountBtn2');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      const userJson = localStorage.getItem('currentUser');

      if (userJson) {
       
        window.location.href = '../profile/UserProfile.html';
      } else {
       
        alert('You must be logged in to view your account.');
        window.location.href = '../accountLogin/account-login.html';
      }
    });
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const userJson = localStorage.getItem("currentUser");

  if (!userJson) {
    console.log("Guest user detected");
    sessionStorage.setItem("userType", "guest");
  } else {
    console.log("Logged-in user detected");
    sessionStorage.setItem("userType", "user");
  }
});


window.addEventListener("DOMContentLoaded", () => {

  const userJson = localStorage.getItem("currentUser");

  if (!userJson) {
    sessionStorage.setItem("userType", "guest");
  } else {
    sessionStorage.setItem("userType", "user");
  }

  
  const cartBtns = document.querySelectorAll(".CartBtn1, .CartBtn2");

  cartBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const userType = sessionStorage.getItem("userType");

      if (userType === "guest" || !userType) {
        alert("You are using a guest account. Please log in to access the cart.");
        window.location.href = "../accountLogin/account-login.html";
      } else {
        window.location.href = "../CartPage/CartPage.html";
      }
    });
  });
});
