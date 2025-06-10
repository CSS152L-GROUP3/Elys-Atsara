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
      .select('*') // Fetch all columns if needed
      .eq('email', email)
      .single();

    if (error || !data) {
      alert('Invalid email or password. Please try again.');
      return;
    }

    if (data.password === password) {
      alert('Login successful!');
      
      // ✅ Store the user data in localStorage
      localStorage.setItem('currentUser', JSON.stringify(data));
      
      // ✅ Redirect to homepage
      window.location.href = '../homepage/homepage.html';
    } else {
      alert('Incorrect password. Please try again.');
    }
  } catch (error) {
    alert('An error occurred: ' + error.message);
  }
}
