import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://qjokcvkcibztiibpwqsv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2tjdmtjaWJ6dGlpYnB3cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5MzgsImV4cCI6MjA2MzQ5NTkzOH0.zibSsjUbI96fcDCDcOpwnBjW__ep0kzsdCW7dSLVkMs' 
export const supabase = createClient(supabaseUrl, supabaseKey, {
auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

