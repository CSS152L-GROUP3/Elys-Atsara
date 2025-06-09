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

    // Validate email domain before signup
    if (!isValidEmailDomain(email)) {
      alert('Please use a valid email only.');
      return;
    }

    try {
      // Step 1: Create user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('duplicate key value')) {
          alert('Account is already in use');
        } else {
          alert('Error: ' + signUpError.message);
        }
        return;
      }

      const auth_id = data.user.id;

      // Step 2: Insert into user_accounts
      const { error: insertError } = await supabase
        .from('user_accounts')
        .insert([{ auth_id, password, name, email, mobile_no, role }]);

      if (insertError) {
        if (insertError.message.includes('duplicate key value')) {
          alert('Account is already in use');
        } else {
          alert('Error: ' + insertError.message);
        }
        return;
      }

      alert('Account created successfully!');
      form.reset();
    } catch (err) {
      alert('Unexpected error occurred: ' + err.message);
      console.error('Supabase error:', err);
    }
  });
});
