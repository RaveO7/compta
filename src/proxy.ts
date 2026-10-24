import { NextResponse } from "next/server";
import { auth, estAutorise } from "@/auth";

// L'email est revérifié à chaque requête : un compte retiré de la liste
// perd l'accès immédiatement, même avec une session encore valide.
export default auth((request) => {
  if (estAutorise(request.auth?.user?.email)) return;

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const url = new URL("/connexion", request.nextUrl.origin);
  url.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(url);
});

export const config = {
  // Tout est protégé sauf la page de connexion, les routes Auth.js et les fichiers statiques.
  matcher: [
    "/((?!connexion|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
