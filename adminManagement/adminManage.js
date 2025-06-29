import { supabase } from '../supabaseClient/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const adminTableBody = document.querySelector('#adminTable tbody');
  const addAdminForm = document.querySelector('#addAdminForm');

  await loadAdmins();

  addAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const fullName = document.getElementById('adminName').value.trim();

    if (!email || !fullName) {
      alert('Please fill in all fields.');
      return;
    }

    // Create Supabase auth user
    const { data: signup, error: signupError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
    });

    if (signupError) {
      alert('Error creating Supabase user: ' + signupError.message);
      return;
    }

    const uuid = signup.user.id;

    // Insert to admin_accounts table
    const { error: insertError } = await supabase.from('admin_accounts').insert([
      {
        uuid: uuid,
        email: email,
        name: fullName,
      },
    ]);

    if (insertError) {
      alert('Error saving admin info: ' + insertError.message);
      return;
    }

    alert('Admin created! Email sent for verification.');
    addAdminForm.reset();
    await loadAdmins();
  });

  async function loadAdmins() {
    adminTableBody.innerHTML = '';

    const { data: admins, error } = await supabase
      .from('admin_accounts')
      .select('uuid, email, name');

    if (error) {
      console.error('Error fetching admins:', error.message);
      return;
    }

    for (const admin of admins) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.uuid);

      let isVerified = false;
      if (userData?.user?.email_confirmed_at) {
        isVerified = true;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${admin.email}</td>
        <td>${admin.name}</td>
        <td>${isVerified ? 'TRUE' : 'FALSE'}</td>
        <td><button class="delete-btn" data-id="${admin.uuid}">Delete</button></td>
      `;
      adminTableBody.appendChild(tr);
    }

    document.querySelectorAll('.delete-btn').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        const uuid = e.target.getAttribute('data-id');
        const confirmed = confirm('Delete this admin? This will also delete their auth account.');

        if (!confirmed) return;

        const { error: dbError } = await supabase.from('admin_accounts').delete().eq('uuid', uuid);
        const { error: authError } = await supabase.auth.admin.deleteUser(uuid);

        if (dbError || authError) {
          alert('Failed to delete admin.');
          console.error(dbError || authError);
        } else {
          alert('Admin deleted.');
          await loadAdmins();
        }
      })
    );
  }
});
