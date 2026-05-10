import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://pqquftcujwwofcazoqqk.supabase.co').replace(/\s/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcXVmdGN1and3b2ZjYXpvcXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjk5MTIsImV4cCI6MjA5Mzc0NTkxMn0.qQ0Lvny2zppho3VoLr-SHQboverj2xz-v4TmPSFewNg').replace(/\s/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
