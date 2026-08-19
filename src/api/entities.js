import { supabase } from './supabaseClient';


export const Query = supabase.entities.Query;



// auth sdk:
export const User = supabase.auth;