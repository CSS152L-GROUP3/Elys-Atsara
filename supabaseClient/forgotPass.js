import { supabase } from './supabase.js';

    const form = document.getElementById('resetForm');
    const messageEl = document.getElementById('message');

 
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');

    if (!accessToken) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Invalid or missing token. Please request a new password reset.';
      form.style.display = 'none';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      messageEl.textContent = '';
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'Passwords do not match.';
        return;
      }

      if (newPassword.length < 6) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'Password must be at least 6 characters.';
        return;
      }

      try {
      
        const { data, error } = await supabase.auth.updateUser({
          accessToken: accessToken,
          password: newPassword,
        });

        if (error) {
          messageEl.style.color = 'red';
          messageEl.textContent = `Error: ${error.message}`;
          return;
        }

        messageEl.style.color = 'green';
        messageEl.textContent = 'Password successfully updated! You can now log in with your new password.';
        form.reset();
        form.style.display = 'none';
      } catch (err) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'Unexpected error. Please try again.';
        console.error(err);
      }
    });