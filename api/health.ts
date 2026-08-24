// GET /api/health — 疎通確認と環境変数のセットアップ状況を返す（値は返さない）
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    env: {
      APP_PASSWORD: !!process.env.APP_PASSWORD,
      APP_USERNAME: process.env.APP_USERNAME || '(default: peacehome)',
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      PROJECTS_SHEET_ID: !!process.env.PROJECTS_SHEET_ID,
      BUDGET_SHEET_ID: !!process.env.BUDGET_SHEET_ID,
    },
  });
}
