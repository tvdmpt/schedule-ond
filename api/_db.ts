import { neon } from "@neondatabase/serverless";
export function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Не задан DATABASE_URL. Добавьте Neon connection string в Environment Variables Vercel.");
  return neon(url);
}
export function asJson(value: unknown) { return JSON.stringify(value); }