  import { supabase } from "./supabase";
 
  async function getCurrentUser() {
  
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    if (session) {
     
      const user = session.user
      console.log('Current user:', user)
      return user
    } else {
      
      console.log('No user logged in')
      return null
    }
  }

  getCurrentUser()