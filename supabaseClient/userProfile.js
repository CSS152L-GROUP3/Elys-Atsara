import { supabase } from './supabase.js'; 

async function loadUserProfile() {
  const user = supabase.auth.user();

  if (!user) {
    alert('Please log in first!');
    window.location.href = 'homepage.html'; // or login page
    return;
  }

  const { data, error } = await supabase
    .from('profiles')  // adjust table name if different
    .select('email, fullname, mobile_no, role')
    .eq('email', user.email)  // use email to fetch the profile
    .single();

  if (error) {
    console.error('Error loading profile:', error);
    return;
  }

  document.getElementById('email').textContent = data.email || '';
  document.getElementById('fullname').textContent = data.fullname || '';
  document.getElementById('mobile_no').textContent = data.mobile_no || '';
  document.getElementById('role').textContent = data.role || '';
}

window.onload = loadUserProfile;
