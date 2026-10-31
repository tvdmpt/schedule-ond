import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sqlClient } from "./_db.js";
export default async function handler(req: VercelRequest,res: VercelResponse) {
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  try {
    const sql=sqlClient();
    const employees=await sql`SELECT id,surname,first_name,hourly_rate FROM employees ORDER BY surname,first_name`;
  const wishes = await sql`
  SELECT
    w.employee_id,
    e.surname,
    e.first_name,
    e.hourly_rate,
    w.days,
    w.restriction_text,
    w.updated_at,
    w.week_start
  FROM wishes w
  JOIN employees e ON e.id = w.employee_id
  ORDER BY w.week_start DESC, e.surname, e.first_name
`;
    return res.status(200).json({employees,wishes});
  } catch(e) { return res.status(500).json({error:e instanceof Error?e.message:"Database error"}); }
}
