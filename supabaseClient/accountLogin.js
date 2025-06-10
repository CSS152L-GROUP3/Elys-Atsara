import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.querySelector('.SignInBtn');
  if (!signInBtn) {
    console.error('Sign in button not found.');
    return;
  }

  signInBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleLogin();
  });
});

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*') 
      .eq('email', email)
      .single();

    if (error || !data) {
      alert('Invalid email or password. Please try again.');
      return;
    }

    if (data.password === password) {
      alert('Login successful!');
      
      
      localStorage.setItem('currentUser', JSON.stringify(data));
      
    
      window.location.href = '../homepage/homepage.html';
    } else {
      alert('Incorrect password. Please try again.');
    }
  } catch (error) {
    alert('An error occurred: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const signUpBtn = document.querySelector('.SignUpBtn');

  if (signUpBtn) {
    signUpBtn.addEventListener('click', () => {
      window.location.href = '../accountCreation/account-creation.html';
    });
  }
});


document.getElementById("guestBtn").addEventListener("click", function () {

  sessionStorage.setItem("userType", "guest");
  alert("You are using a guest account.");
  window.location.href = "../Homepage/homepage.html";
  
});

