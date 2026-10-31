import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sqlClient } from "./_db.js";
const POINTS=["Верхние Котлы-01","Верхние Котлы-03","ЗИЛ"];
export default async function handler(req: VercelRequest,res: VercelResponse) {
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try {
    const {week_start,work_date,assignments=[]}=req.body||{};
    if(!week_start||!work_date||!Array.isArray(assignments)) return res.status(400).json({error:"Некорректные данные"});
    for(const a of assignments) if(!POINTS.includes(a.point)||!a.employee_id||!a.from||!a.to||a.from>=a.to) return res.status(400).json({error:"Проверьте назначения и интервалы"});
    for(let i=0;i<assignments.length;i++) for(let j=i+1;j<assignments.length;j++) {
      const a=assignments[i],b=assignments[j];
      if(a.employee_id===b.employee_id&&a.from<b.to&&b.from<a.to) return res.status(409).json({error:"Один сотрудник не может работать на двух точках одновременно"});
    }
    const sql=sqlClient();
    await sql`DELETE FROM assignments WHERE work_date=${work_date}`;
    for(const a of assignments) await sql`INSERT INTO assignments (week_start,work_date,point,employee_id,start_time,end_time) VALUES (${week_start},${work_date},${a.point},${a.employee_id},${a.from},${a.to})`;
    return res.status(200).json({ok:true});
  } catch(e) { return res.status(500).json({error:e instanceof Error?e.message:"Database error"}); }
}