import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sqlClient } from "./_db.js";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  try {
    const {surname,first_name,hourly_rate=0}=req.body||{};
    if(!surname?.trim()||!first_name?.trim()) return res.status(400).json({error:"Укажите фамилию и имя"});
    const sql=sqlClient();
    const rows=await sql`INSERT INTO employees (surname,first_name,hourly_rate) VALUES (${surname.trim()},${first_name.trim()},${Math.max(0,Number(hourly_rate)||0)}) RETURNING id,surname,first_name,hourly_rate`;
    return res.status(200).json({employee:rows[0]});
  } catch(e) { return res.status(500).json({error:e instanceof Error?e.message:"Database error"}); }
}