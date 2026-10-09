import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cfzdxgpoltfwrzdzqfdv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lq_jcXpi8Fd0U_0ZUdv3dA_UNW9KNSU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
