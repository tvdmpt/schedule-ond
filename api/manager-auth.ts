import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest,res: VercelResponse) {
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const expected=process.env.ADMIN_PASSWORD;
  if(!expected) return res.status(503).json({error:"Задайте ADMIN_PASSWORD в настройках Vercel"});
  if(req.body?.password!==expected) return res.status(401).json({error:"Неверный пароль"});
  // MVP gate: subsequent manager API calls also require the password header.
  return res.status(200).json({ok:true});
}