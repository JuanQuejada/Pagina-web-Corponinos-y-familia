// ============================================================
// CLIENTE ADMINISTRADOR SUPABASE
// CSNiños y Familia Portal
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { Database } from "./database";

// ============================================================
// VARIABLES DE ENTORNO
// ============================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("SUPABASE URL:", !!supabaseUrl);
console.log("SERVICE ROLE:", !!serviceRoleKey);

// ============================================================
// CLIENTE ADMINISTRADOR
// ============================================================

export const supabaseAdmin =
  createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth:{

        autoRefreshToken:false,

        persistSession:false,

      },
    }
  );

// ============================================================
// OBTENER USUARIO COMPLETO
// ============================================================

export async function getCurrentUser(
  token:string
){

  try{

    const{

      data:{ user },

      error,

    }=
      await supabaseAdmin.auth.getUser(
        token
      );

    if(error || !user){

      return null;

    }

    const{

      data:usuario,

      error:usuarioError,

    }=
      await supabaseAdmin
        .from("usuarios")
        .select(`
          *,
          rol:roles(*),
          area:areas(*),
          departamento:departamentos(*)
        `)
        .eq(
          "id",
          user.id
        )
        .single();

    if(usuarioError){

      return null;

    }

    return usuario;

  }catch(error){

    console.error(
      "Error obteniendo usuario:",
      error
    );

    return null;

  }

}

// ============================================================
// VALIDAR PERMISOS
// ============================================================

export function tienePermiso(

  usuario:{
    rol?:{
      nivel:number;
      permisos:Record<string,string[]>;
    };
  } | null,

  recurso:string,

  accion:string

):boolean{

  if(!usuario?.rol){

    return false;

  }

  if(usuario.rol.nivel===1){

    return true;

  }

  const permisos=
    usuario.rol.permisos?.[recurso];

  if(!permisos){

    return false;

  }

  return permisos.includes(
    accion
  );

}

// ============================================================
// ES ADMIN
// ============================================================

export function esAdmin(

  usuario:{
    rol?:{
      nivel:number;
    };
  } | null

){

  return(

    usuario?.rol?.nivel!==undefined &&

    usuario.rol.nivel<=2

  );

}

// ============================================================
// ES SUPER ADMIN
// ============================================================

export function esSuperAdmin(

  usuario:{
    rol?:{
      nivel:number;
    };
  } | null

){

  return(

    usuario?.rol?.nivel===1

  );

}