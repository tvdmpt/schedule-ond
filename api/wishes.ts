import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sqlClient } from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = sqlClient();

    // Удаление пожелания — только для менеджера
    if (req.method === "DELETE") {
      const { employee_id, week_start, password } = req.body || {};
      const expected = process.env.ADMIN_PASSWORD;

      if (!expected || password !== expected) {
        return res.status(401).json({ error: "Нет доступа к удалению" });
      }

      if (!employee_id || !week_start) {
        return res.status(400).json({
          error: "Не указаны сотрудник и неделя",
        });
      }

      const deleted = await sql`
        DELETE FROM wishes
        WHERE employee_id = ${employee_id}
          AND week_start = ${week_start}
        RETURNING id
      `;

      if (!deleted.length) {
        return res.status(404).json({
          error: "Пожелание не найдено",
        });
      }

      return res.status(200).json({ ok: true });
    }

    // Отправка или обновление пожелания
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      employee_id,
      week_start,
      days,
      restriction_text = "",
      hourly_rate,
    } = req.body || {};

    if (
      !employee_id ||
      !week_start ||
      !Array.isArray(days) ||
      days.length !== 7
    ) {
      return res.status(400).json({
        error: "Нужно заполнить все семь дней",
      });
    }

    for (const d of days) {
      if (
        !d.off &&
        (!d.from ||
          !d.to ||
          d.from < "07:00" ||
          d.to > "22:00" ||
          d.from >= d.to)
      ) {
        return res.status(400).json({
          error: "Интервал должен быть внутри 07:00–22:00",
        });
      }
    }

    const employee = await sql`
      UPDATE employees
      SET hourly_rate = ${Math.max(0, Number(hourly_rate) || 0)}
      WHERE id = ${employee_id}
      RETURNING id
    `;

    if (!employee.length) {
      return res.status(404).json({
        error: "Сотрудник не найден",
      });
    }

    const rows = await sql`
      INSERT INTO wishes (
        employee_id,
        week_start,
        days,
        restriction_text,
        status,
        updated_at
      )
      VALUES (
        ${employee_id},
        ${week_start},
        ${JSON.stringify(days)}::jsonb,
        ${restriction_text},
        'submitted',
        NOW()
      )
      ON CONFLICT (employee_id, week_start)
      DO UPDATE SET
        days = EXCLUDED.days,
        restriction_text = EXCLUDED.restriction_text,
        status = 'submitted',
        updated_at = NOW()
      RETURNING id
    `;

    return res.status(200).json({
      ok: true,
      id: rows[0].id,
    });
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Database error",
    });
  }
}
