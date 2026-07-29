// ============================================================
// CLIENTE SUPABASE (NAVEGADOR)
// CSNiños y Familia Portal
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database/database.types";

// ============================================================
// VARIABLES DE ENTORNO
// ============================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================================
// CLIENTE PÚBLICO
// ============================================================

export const supabase =
  createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {

        persistSession:true,

        autoRefreshToken:true,

        detectSessionInUrl:true,

      },
    }
  );

// ============================================================
// OBTENER USUARIO AUTH
// ============================================================

export async function getAuthUser(){

  const {

    data:{ user },

    error,

  }=
    await supabase.auth.getUser();

  if(error){

    return null;

  }

  return user;

}