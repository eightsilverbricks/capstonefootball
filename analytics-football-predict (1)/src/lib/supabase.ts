import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://isslouvqvhukfdbszxhl.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImQ0MjE2MDI3LTBiZGEtNGZlZC1hY2U4LWI2NGQ2OWQ5ZmNlZSJ9.eyJwcm9qZWN0SWQiOiJpc3Nsb3V2cXZodWtmZGJzenhobCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY2MTAxMzkyLCJleHAiOjIwODE0NjEzOTIsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.sH9b6gEoSEc6DT15ZmmhwomtLsbukx9mberyMVnTEo4';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };