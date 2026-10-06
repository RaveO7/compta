import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// En local : .env.local (récupéré via `vercel env pull`) prioritaire sur .env
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations-postgres",
  },
  datasource: {
    // Les migrations passent par la connexion directe (non poolée) de Neon
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
