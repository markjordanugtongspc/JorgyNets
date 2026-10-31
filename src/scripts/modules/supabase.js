import { createClient } from '@supabase/supabase-js'

// START: supabaseClient - Initializes singleton browser Supabase client for direct HTTPS REST & WebSockets
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://junpnybtfzgxkyrixvpe.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bnBueWJ0ZnpneGt5cml4dnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTEwNTksImV4cCI6MjEwODg2NzA1OX0.SpuQ_vDYCJb6gpUiqZgvzLmj16JCIhzLPR2z7t290Os'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// END: supabaseClient - Client instance exported
