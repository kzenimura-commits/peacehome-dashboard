// GET /api/data
// 3〜4つのGoogle Sheetsを読み取り、正規化してJSONで返す
// 5分キャッシュ（stale-while-revalidate 10分）

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRange } from '../lib/sheets';
import { parseProjectSheet, mergeBudgetData, parseTargetsSheet, type Project } from '../lib/parsers';
import { checkBasicAuth } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // フォールバック認証（middleware が無効化されていた場合の保険）
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Peace Home Dashboard"');
    return res.status(401).send('Authentication required');
  }

  try {
    const projectsSheetId = process.env.PROJECTS_SHEET_ID;
    const budgetSheetId = process.env.BUDGET_SHEET_ID;

    if (!projectsSheetId) {
      return res.status(500).json({ error: 'PROJECTS_SHEET_ID 未設定' });
    }

    const tabs = (process.env.PROJECTS_SHEET_TABS || '【注文】44期,【ひなた】44期,【建売・モデル】44期')
      .split(',').map(s => s.trim()).filter(Boolean);
    const budgetTab = process.env.BUDGET_SHEET_TAB || '原価管理（新築）';
    const targetsTab = process.env.TARGETS_SHEET_TAB || '';

    const projectRanges = tabs.map(t => `${t}!A1:BQ200`);
    const results = await Promise.allSettled([
      ...projectRanges.map(r => readRange(projectsSheetId, r)),
      budgetSheetId ? readRange(budgetSheetId, `${budgetTab}!A1:BZ200`) : Promise.resolve([]),
      targetsTab && budgetSheetId ? readRange(budgetSheetId, `${targetsTab}!A1:P50`) : Promise.resolve([]),
    ]);

    const projects: Project[] = [];
    tabs.forEach((tab, i) => {
      const r = results[i];
      if (r.status !== 'fulfilled') {
        console.error(`Failed to read ${tab}:`, r.reason);
        return;
      }
      const idPrefix = tab.includes('ひなた') ? 'H' : tab.includes('建売') ? 'B' : 'S';
      const parsed = parseProjectSheet(r.value, tab, idPrefix);
      projects.push(...parsed);
    });

    const budgetRes = results[tabs.length];
    if (budgetRes && budgetRes.status === 'fulfilled') {
      mergeBudgetData(projects, budgetRes.value);
    }

    let targets: Record<string, number[]> = {};
    const targetsRes = results[tabs.length + 1];
    if (targetsRes && targetsRes.status === 'fulfilled' && targetsRes.value.length) {
      targets = parseTargetsSheet(targetsRes.value);
    }

    const ttl = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10);
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);
    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      count: projects.length,
      projects,
      targets,
      warnings: results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason?.message || 'unknown error'),
    });
  } catch (err: any) {
    console.error('data.ts error:', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
}
