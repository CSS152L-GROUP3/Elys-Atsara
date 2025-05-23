// main.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qjokcvkcibztiibpwqsv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2tjdmtjaWJ6dGlpYnB3cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5MzgsImV4cCI6MjA2MzQ5NTkzOH0.zibSsjUbI96fcDCDcOpwnBjW__ep0kzsdCW7dSLVkMs' 
const supabase = createClient(supabaseUrl, supabaseKey)

const form = document.getElementById('signupForm')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = form.name.value.trim()
  const email = form.email.value.trim()
  const password = form.password.value
  const mobile_no = form.mobile_no.value.trim()
  const role = form.role.value.trim()

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })
    if (signUpError) throw signUpError

    const { error: insertError } = await supabase
      .from('user_accounts')
      .insert([{ name, email, password, mobile_no, role }])

    if (insertError) throw insertError

    alert('Account created successfully!')
    form.reset()
  } catch (error) {
    alert('Error: ' + error.message)
    console.error('Supabase Error:', error)
  }
})
