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
      .select('email, password')
      .eq('email', email)
      .single();

    if (error) {
      alert('Invalid email or password. Please try again.');
      return;
    }

    if (!data) {
      alert('Email not found. Please sign up first.');
      return;
    }

    if (data.password === password) {
      alert('Login successful!');
      window.location.href = '../homepage/homepage.html';
    } else {
      alert('Incorrect password. Please try again.');
    }
  } catch (error) {
    alert('An error occurred: ' + error.message);
  }
}
