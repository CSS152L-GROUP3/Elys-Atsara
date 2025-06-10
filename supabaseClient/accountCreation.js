import { supabase } from './supabase.js';

function isValidEmailDomain(email) {
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && commonDomains.includes(domain);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');

  if (!form) {
    console.error('Signup form not found.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const mobile_no = form.mobile_no.value.trim();
    const role = form.role.value.trim();

    if (!name || !email || !password || !mobile_no || !role) {
      alert('Please fill in all fields.');
      return;
    }

    if (!isValidEmailDomain(email)) {
      alert('Please use a valid email address.');
      return;
    }

    try {
      // Check if email is already registered
      const { data: user, error: userError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        alert('Error checking user account: ' + userError.message);
        return;
      }

      if (user) {
        alert('An account with this email is already registered.');
        return;
      }

      // Sign up user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            mobile_no,
            role, 
            password
          },
          emailRedirectTo: 'http://127.0.0.1:5500/accountLogin/account-login.html'
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          alert('An account with this email is already registered. Please check your email for confirmation.');
        } else {
          alert('Signup failed: ' + error.message);
        }
        return;
      }

      alert('Account created! Please check your email to confirm your address.');
      form.reset();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong. Please try again later.');
    }
  });
});