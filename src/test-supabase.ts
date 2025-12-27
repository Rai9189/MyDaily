import { supabase } from './lib/supabase';

// Test koneksi
async function testConnection() {
  const { data, error } = await supabase.from('profiles').select('count');
  
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('Connection successful!');
  }
}

testConnection();