// スプレッドシート行データを Project オブジェクトに変換

export interface Project {
  id: string;
  name: string;
  cat: 'ph' | 'hinata' | 'struct' | 'long';
  adv: string;
  design: string;
  ic: string;
  kx: string;
  contract: string;
  cstart: string;
  cfinish: string;
  m1: string; m2: string; m3: string; m4: string;
  m5: string; m6: string; m7: string; m8: string;
  afinish: string;
  camt: number;
  bclose: string;
  bamt: number;
  acost: number;
  gm: number;
}

// 44期 = 2025.9〜2026.8 のデフォルト
const FY_START_YEAR = parseInt(process.env.FISCAL_YEAR_START || '2025', 10);

const cellStr = (v: any): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

const cellNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s]/g, ''));
  return isFinite(n) ? n : 0;
};

// Excel serial (days since 1900-01-01) → JS Date
function serialToISO(n: number): string {
  // Excel の 1900 leap year bug 補正込み
  const ms = Math.round((n - 25569) * 86400000);
  const d = new Date(ms);
  if (!isFinite(d.getTime()) || d.getUTCFullYear() < 1970 || d.getUTCFullYear() > 2100) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// あらゆる日付表現を YYYY-MM-DD に統一
export function toISO(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  // 数値 → Excel serial として解釈
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) return serialToISO(v);
    return '';
  }
  const s = String(v).trim();
  if (!s || s.length < 3) return '';
  // YYYY-MM-DD or YYYY/MM/DD
  const m1 = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  // MM/DD/YYYY (US)
  const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  // M/D 単独（会計年度から推定）
  const m3 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m3) {
    const mo = parseInt(m3[1], 10);
    const day = parseInt(m3[2], 10);
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      // 期が9月始まりの想定：9-12月 → FY_START_YEAR、1-8月 → FY_START_YEAR+1
      const year = mo >= 9 ? FY_START_YEAR : FY_START_YEAR + 1;
      return `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

// 44期シートの物件行パーサ（1物件=2行構成）
export function parseProjectSheet(
  rows: any[][],
  brandHint: string,
  idPrefix: string
): Project[] {
  const out: Project[] = [];
  for (let r = 4; r < rows.length - 1; r += 2) {
    const row1 = rows[r] || [];
    const row2 = rows[r + 1] || [];

    const name = cellStr(row1[7]); // H列=col8
    if (!name || name === '合計' || name === '施主名' || name.length < 2) continue;

    // 契約日は R5(name行) col16 を優先、fallback R6 col16
    const contract = toISO(row1[15]) || toISO(row2[15]);
    if (!contract) continue;

    // 区分判定
    let cat: Project['cat'] = 'ph';
    const brandStr = brandHint || '';
    if (brandStr.includes('ひなた') || name.includes('ひなた')) cat = 'hinata';
    else if (cellStr(row1[25]).match(/あり|有/)) cat = 'struct'; // Z列=構造計算
    else if (cellStr(row1[28]).match(/長期|優良/) || cellStr(row2[28]).match(/長期|優良/)) cat = 'long';

    const proj: Project = {
      id: `${idPrefix}-${cellStr(row1[3]) || String(r)}`,
      name,
      cat,
      adv: cellStr(row2[10]),        // K列
      design: cellStr(row2[11]),     // L列
      ic: cellStr(row2[9]),          // J列
      kx: cellStr(row1[9]),          // J列 row1（工務担当は原価管理シートから上書きされる）
      contract,
      cstart: toISO(row1[32]),       // AG列=col33 契約書着工
      cfinish: toISO(row1[38]),      // AM列=col39 契約書完工
      m1: toISO(row2[18]),           // S列=col19 図面確定
      m2: '',
      m3: toISO(row2[16]),           // Q列=col17 仕様確定
      m4: toISO(row2[26]),           // AA列=col27 確認提出
      m5: toISO(row2[27]),           // AB列=col28 確認許可
      m6: toISO(row2[19]),           // T列=col20 社内打合
      m7: toISO(row2[20]) || toISO(row2[21]),
      m8: toISO(row2[32]),           // AG列=col33 実際着工
      afinish: toISO(row2[41]) || toISO(row2[38]), // 完工実績
      camt: 0, bclose: '', bamt: 0, acost: 0, gm: 0,
    };
    out.push(proj);
  }
  return out;
}

// 原価管理シートを既存Projectとマージ
export function mergeBudgetData(projects: Project[], rows: any[][]): void {
  for (let r = 17; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = cellStr(row[0]);
    if (!name || name.includes('DIV/0') || name === '#REF!') continue;
    // 名前正規化してマッチ
    const key = normalizeName(name);
    if (!key) continue;
    const match = projects.find(p => {
      const pk = normalizeName(p.name);
      return pk && key && (pk.startsWith(key.slice(0, 2)) || key.startsWith(pk.slice(0, 2)));
    });
    if (!match) continue;

    match.kx = cellStr(row[3]) || match.kx;
    match.gm = Math.round(cellNum(row[4]) * 1000) / 10; // 粗利率 → %
    match.camt = Math.round(cellNum(row[9]) / 10000);   // J列 契約金 → 万円
    match.bclose = toISO(row[15]);
    match.bamt = Math.round(cellNum(row[16]) / 10000);
    match.acost = Math.round(cellNum(row[18]) / 10000);
  }
}

function normalizeName(n: string): string {
  return n.replace(/様邸|\s+|　+|ひなた|注文|建売|モデル|様/g, '').trim();
}

// 45期 店舗集計 → ADV別月次目標
export function parseTargetsSheet(rows: any[][]): Record<string, number[]> {
  const targets: Record<string, number[]> = {};
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const label = cellStr(row[0]);
    const m = label.match(/^(.+?)\s*目標$/);
    if (!m) continue;
    const adv = m[1].trim();
    if (adv === '店舗合計' || adv === '合計') continue;
    const arr: number[] = [];
    for (let c = 2; c <= 13; c++) arr.push(cellNum(row[c]));
    if (arr.some(v => v > 0)) targets[adv] = arr;
  }
  return targets;
}
