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
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_accounts')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        alert('This email is already registered.');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('user_accounts')
        .insert([{ name, email, password, mobile_no, role }]);

      if (insertError) {
        alert('Error creating account: ' + insertError.message);
        return;
      }

      alert('Account created successfully! You may now log in.');
      form.reset();
      window.location.href = '../accountLogin/account-login.html';
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong. Please try again later.');
    }
  });
});
