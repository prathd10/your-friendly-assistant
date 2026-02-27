import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhwbgigypsufyjhcgtdn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impod2JnaWd5cHN1ZnlqaGNndGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzIyNzcsImV4cCI6MjA4NzI0ODI3N30.ubS1vm7THRaEmscxVQ5-EG0noj1riex6Z7z8oKttdN0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
