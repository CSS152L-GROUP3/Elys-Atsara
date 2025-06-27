import { supabase } from './supabase.js';

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not logged in');
  console.log('Current user:', user);
  return user;
}

export async function fetchShippingOptions() {
  const { data, error } = await supabase.from('shipping_options').select('*');
  if (error) throw error;
  return data;
}

export async function fetchDefaultAddress(userId) {
  console.log('Fetching address for user:', userId);

  const { data: defaultAddress, error: defaultError } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (defaultError) {
    console.error('Error fetching default address:', defaultError);
    throw defaultError;
  }

  if (defaultAddress && defaultAddress.length > 0) {
    return defaultAddress[0];
  }

  // fallback if no default
  const { data: anyAddress, error: anyError } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (anyError) {
    console.error('Error fetching fallback address:', anyError);
    throw anyError;
  }

  return anyAddress?.[0] || null;
}

export async function fetchCustomerInfo(userId) {
  const { data, error } = await supabase
    .from('customer_accounts')
    .select('name, mobile_no')
    .eq('uuid', userId)
    .single();

  if (error) {
    console.error('Error fetching customer info:', error);
    throw error;
  }

  return data;
}
