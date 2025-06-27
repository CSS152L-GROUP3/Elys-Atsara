import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusBox = document.getElementById('status');

 
  await supabase.auth.getSession();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    statusBox.innerHTML = `
      <p class="error"> Failed to verify email. Please try again later.</p>
    `;
    console.error('Auth error:', error);
    return;
  }

  
  if (!user.email_confirmed_at) {
    statusBox.innerHTML = `
      <p class="error"> Email is not verified yet. Please click the magic link in your email.</p>
    `;
    console.warn('Email not verified');
    return;
  }

  
  const { id: uuid, email, user_metadata } = user;
  const { name, mobile_no, role, password } = user_metadata || {};

  if (!uuid || !name || !email || !mobile_no || !role || !password) {
    statusBox.innerHTML = `
      <p class="error"> Incomplete user data. Please contact support.</p>
    `;
    return;
  }

  const targetTable = role === 'admin' ? 'admin_accounts' : 'customer_accounts';

  try {
    
    const { data: existing, error: fetchError } = await supabase
      .from(targetTable)
      .select('uuid')
      .eq('uuid', uuid)
      .maybeSingle();

    if (!existing) {
     
      const { error: insertError } = await supabase
        .from(targetTable)
        .insert([{ uuid, name, email, mobile_no, role, password }]);

      if (insertError) throw insertError;
    }

  
    statusBox.innerHTML = `
      <h1>Email Verified!</h1>
      <p>Thank you for verifying your email address.</p>
      <p>You can now log in to Ely’s Atsara.</p>
      <a href="../accountLogin/account-login.html">Go to Login</a>
    `;

  } catch (err) {
    console.error('Insert error:', err);
    statusBox.innerHTML = `
      <p class="error"> An error occurred while setting up your account. Please try again.</p>
    `;
  }
});
