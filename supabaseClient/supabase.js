
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjokcvkcibztiibpwqsv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2tjdmtjaWJ6dGlpYnB3cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5MzgsImV4cCI6MjA2MzQ5NTkzOH0.zibSsjUbI96fcDCDcOpwnBjW__ep0kzsdCW7dSLVkMs'

export const supabase = createClient(supabaseUrl, supabaseKey)

const SupabaseService = {
  async insert(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
    if (error) throw error
    return result
  },

  async select(table, column, value) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, value)
    if (error) throw error
    return data
  },

  async selectAll(table) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
    if (error) throw error
    return data
  },

  async update(table, column, value, updateData) {
    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq(column, value)
    if (error) throw error
    return data
  },

  async delete(table, column, value) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(column, value)
    if (error) throw error
    return data
  }
}

export default SupabaseService