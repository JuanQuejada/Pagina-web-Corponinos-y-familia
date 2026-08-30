import { NextResponse } from "next/server";
import { jsonError } from "@/lib/document-domain";
import { createRepositoryToken, getRepositoryTokenFromRequest, repositoryCookieName, repositoryTtlSeconds, verifyRepositoryToken } from "@/lib/repository-session";

export async function POST(request: Request) {
  try {
    const current = verifyRepositoryToken(getRepositoryTokenFromRequest(request));
    if (!current) return jsonError("Repositorio bloqueado o sesión expirada.", 401);

    const response = NextResponse.json({ success: true, expires_in_seconds: repositoryTtlSeconds() });
    response.cookies.set({
      name: repositoryCookieName(),
      value: createRepositoryToken(current.profileId),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: repositoryTtlSeconds(),
    });
    return response;
  } catch (error: any) {
    return jsonError(error?.message || "No fue posible renovar la sesión.", 500);
  }
}
