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
  
  // First, let's check all addresses in the table
  const { data: allAddresses, error: allAddressesError } = await supabase
    .from('customer_addresses')
    .select('*');
    
  console.log('All addresses in table:', allAddresses);
  if (allAddressesError) {
    console.error('Error fetching all addresses:', allAddressesError);
  }
  
  // Now try to get default address
  const { data: defaultAddress, error: defaultError } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .limit(1);

  if (defaultError) {
    console.error('Error fetching default address:', defaultError);
    throw defaultError;
  }

  console.log('Default address result:', defaultAddress);
  
  if (!defaultAddress || defaultAddress.length === 0) {
    console.log('No default address found, trying to get any address');
    // If no default address exists, try to get any address for the user
    const { data: anyAddress, error: anyAddressError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
      
    if (anyAddressError) {
      console.error('Error fetching any address:', anyAddressError);
      throw anyAddressError;
    }
    
    console.log('Any address result:', anyAddress);
    
    if (!anyAddress || anyAddress.length === 0) {
      console.log('No addresses found at all');
      return null; // No addresses found at all
    }
    return anyAddress[0]; // Return the first address found
  }
  
  return defaultAddress[0]; // Return the first default address found
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
