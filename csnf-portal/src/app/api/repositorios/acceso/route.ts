import { NextResponse } from "next/server";
import { supabaseAdmin, getProfileFromBearer, jsonError } from "@/lib/document-domain";
import { createRepositoryToken, repositoryCookieName, repositoryTtlSeconds } from "@/lib/repository-session";

export async function POST(request: Request) {
  try {
    const actor = await getProfileFromBearer(request);
    if (!actor) return jsonError("Sesión no válida.", 401);

    const body = await request.json().catch(() => ({}));
    const clave = String(body?.clave || "");
    if (!clave) return jsonError("Debes indicar la clave.");

    const supabase = supabaseAdmin();
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("id,clave_repositorio")
      .eq("id", actor.profile.id)
      .single();

    if (error || !user) return jsonError("No se encontró el perfil.", 404);
    if (!user.clave_repositorio || user.clave_repositorio !== clave) return jsonError("La clave de acceso es incorrecta.", 403);

    const response = NextResponse.json({ success: true, autorizado: true, expires_in_seconds: repositoryTtlSeconds() });
    response.cookies.set({
      name: repositoryCookieName(),
      value: createRepositoryToken(actor.profile.id),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: repositoryTtlSeconds(),
    });
    return response;
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible validar el acceso.", 500);
  }
}