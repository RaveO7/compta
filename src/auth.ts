import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Liste des adresses Google autorisées, séparées par des virgules.
const comptesAutorises = (process.env.AUTH_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function estAutorise(email: string | null | undefined) {
  return !!email && comptesAutorises.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },
  callbacks: {
    // Refuse la connexion à tout compte Google hors de la liste.
    signIn({ profile }) {
      return profile?.email_verified === true && estAutorise(profile.email);
    },
  },
});
