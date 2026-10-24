"use server";

import { signIn, signOut } from "@/auth";

export async function connexionGoogle(callbackUrl: string) {
  // N'accepte que des chemins internes pour éviter une redirection ouverte.
  const destination =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";
  await signIn("google", { redirectTo: destination });
}

export async function deconnexion() {
  await signOut({ redirectTo: "/connexion" });
}
