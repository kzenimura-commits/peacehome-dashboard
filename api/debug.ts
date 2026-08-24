// GET /api/debug?tab=【注文】44期&sheet=projects
// スプレッドシートの生データを最大10行返す（パーサー修正用）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRange } from '../lib/sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const which = String(req.query.sheet || 'projects');
    const tab = String(req.query.tab || '【注文】44期');
    const startRow = parseInt(String(req.query.start || '1'), 10);
    const endRow = parseInt(String(req.query.end || '20'), 10);

    const sheetId = which === 'budget'
      ? process.env.BUDGET_SHEET_ID
      : process.env.PROJECTS_SHEET_ID;

    if (!sheetId) {
      return res.status(500).json({ error: 'sheetId 未設定' });
    }

    const range = `${tab}!A${startRow}:BQ${endRow}`;
    const rows = await readRange(sheetId, range);

    return res.status(200).json({
      sheetId,
      tab,
      range,
      rowCount: rows.length,
      // 各行の非nullセルだけ返す (見やすさ優先)
      rows: rows.map((r, i) => ({
        rowIdx: startRow + i,
        cells: r.map((v, ci) => v !== '' && v !== null && v !== undefined ? { col: ci + 1, val: v } : null).filter(Boolean),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'error', stack: err.stack?.split('\n').slice(0, 5) });
  }
}
