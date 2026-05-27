import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Prevent React from crashing if the URL is missing or still set to the placeholder
const validUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(validUrl, validKey);
