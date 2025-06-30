// import { supabase } from '../supabaseClient/supabase.js';

// document.addEventListener('DOMContentLoaded', async () => {
//   const adminTableBody = document.querySelector('#adminTable tbody');
//   const addAdminForm = document.querySelector('#addAdminForm');

//   await loadAdmins();

//   addAdminForm.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const email = document.getElementById('adminEmail').value.trim();
//     const fullName = document.getElementById('adminName').value.trim();

//     if (!email || !fullName) {
//       alert('Please fill in all fields.');
//       return;
//     }

//     // Create Supabase auth user
//     const { data: signup, error: signupError } = await supabase.auth.admin.createUser({
//       email: email,
//       email_confirm: true,
//     });

//     if (signupError) {
//       alert('Error creating Supabase user: ' + signupError.message);
//       return;
//     }

//     const uuid = signup.user.id;

//     // Insert to admin_accounts table
//     const { error: insertError } = await supabase.from('admin_accounts').insert([
//       {
//         uuid: uuid,
//         email: email,
//         name: fullName,
//       },
//     ]);

//     if (insertError) {
//       alert('Error saving admin info: ' + insertError.message);
//       return;
//     }

//     alert('Admin created! Email sent for verification.');
//     addAdminForm.reset();
//     await loadAdmins();
//   });

//   async function loadAdmins() {
//     adminTableBody.innerHTML = '';

//     const { data: admins, error } = await supabase
//       .from('admin_accounts')
//       .select('uuid, email, name');

//     if (error) {
//       console.error('Error fetching admins:', error.message);
//       return;
//     }

//     for (const admin of admins) {
//       const tr = document.createElement('tr');
//       tr.innerHTML = `
//         <td>${admin.email}</td>
//         <td>${admin.name}</td>
//         <td><button class="delete-btn" data-id="${admin.uuid}">Delete</button></td>
//       `;
//       adminTableBody.appendChild(tr);
//     }

//     document.querySelectorAll('.delete-btn').forEach((btn) =>
//       btn.addEventListener('click', async (e) => {
//         const uuid = e.target.getAttribute('data-id');
//         const confirmed = confirm('Delete this admin? This will also delete their auth account.');

//         if (!confirmed) return;

//         const { error: dbError } = await supabase.from('admin_accounts').delete().eq('uuid', uuid);
//         const { error: authError } = await supabase.auth.admin.deleteUser(uuid);

//         if (dbError || authError) {
//           alert('Failed to delete admin.');
//           console.error(dbError || authError);
//         } else {
//           alert('Admin deleted.');
//           await loadAdmins();
//         }
//       })
//     );
//   }
// });


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

    // Create auth user (for client-side sign up)
    const { data: signup, error: signupError } = await supabase.auth.signUp({ email });

    if (signupError || !signup?.user?.id) {
      alert('Error creating Supabase user: ' + (signupError?.message || 'Unknown error'));
      return;
    }

    const uuid = signup.user.id;

    // Save admin in admin_accounts
    const { error: insertError } = await supabase.from('admin_accounts').insert([
      {
        uuid,
        email,
        name: fullName,
      },
    ]);

    if (insertError) {
      alert('Error saving admin info: ' + insertError.message);
      return;
    }

    alert('Admin created! Verification email sent.');
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
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${admin.email}</td>
        <td>${admin.name}</td>
        <td><button class="delete-btn" data-id="${admin.uuid}">Delete</button></td>
      `;
      adminTableBody.appendChild(tr);
    }

    // Add event listener to each delete button
    document.querySelectorAll('.delete-btn').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        const uuid = e.target.getAttribute('data-id');
        const confirmed = confirm('Are you sure you want to delete this admin from admin_accounts?');

        if (!confirmed) return;

        console.log('Attempting to delete admin with UUID:', uuid);

        const { error: dbError } = await supabase
          .from('admin_accounts')
          .delete()
          .eq('uuid', uuid);

        if (dbError) {
          alert('Failed to delete admin from database.');
          console.error(dbError);
        } else {
          alert('Admin successfully removed from admin_accounts.');
          await loadAdmins();
        }
      })
    );
  }
});
