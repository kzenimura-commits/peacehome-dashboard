// スプレッドシート行データを Project オブジェクトに変換

export interface Project {
  id: string;
  name: string;
  cat: 'ph' | 'hinata' | 'struct' | 'long';
  adv: string;
  design: string;
  ic: string;
  kx: string;
  contract: string; // YYYY-MM-DD
  cstart: string;
  cfinish: string;
  m1: string; m2: string; m3: string; m4: string;
  m5: string; m6: string; m7: string; m8: string;
  afinish: string;
  camt: number;   // 契約額（万円）
  bclose: string; // 予算〆日
  bamt: number;   // 積算予算（万円）
  acost: number;  // 実際原価（万円）
  gm: number;     // 契約時粗利率（%）
}

const cellStr = (v: any): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

const cellNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s]/g, ''));
  return isFinite(n) ? n : 0;
};

// Google Sheetsの日付は "M/D/YYYY" or "YYYY/MM/DD" or ISO で返る
const toISO = (v: any): string => {
  const s = cellStr(v);
  if (!s) return '';
  // 既にYYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Google Sheets serial number (rare with UNFORMATTED_VALUE dateTime=FORMATTED)
  const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  return '';
};

// 44期シートの物件行パーサ（1物件=2行構成）
// タブ名から区分を推定（ひなた→hinata、注文→ph、建売→ph）
export function parseProjectSheet(
  rows: any[][],
  brandHint: string,
  idPrefix: string
): Project[] {
  const out: Project[] = [];
  // R1〜R4がヘッダー、R5以降が2行1組の物件データ
  for (let r = 4; r < rows.length - 1; r += 2) {
    const row1 = rows[r] || [];
    const row2 = rows[r + 1] || [];

    const name = cellStr(row1[7]); // H列=col8
    if (!name || name === '合計' || name === '施主名') continue;
    const contract = toISO(row2[15]) || toISO(row1[15]); // P列=col16
    if (!contract) continue;

    // 区分判定
    let cat: Project['cat'] = 'ph';
    if (brandHint.includes('ひなた') || name.includes('ひなた')) cat = 'hinata';
    else if (cellStr(row1[25]).includes('あり')) cat = 'struct'; // Z列=構造計算
    else if (cellStr(row1[28]).match(/長期|優良/)) cat = 'long';

    const proj: Project = {
      id: `${idPrefix}-${cellStr(row1[3]) || String(r)}`,
      name,
      cat,
      adv: cellStr(row2[10]),        // K列
      design: cellStr(row2[11]),     // L列
      ic: cellStr(row2[9]),          // J列
      kx: cellStr(row1[9]),          // J列 row1
      contract,
      cstart: toISO(row1[32]),       // AG列=col33 契約書着工
      cfinish: toISO(row1[38]),      // AM列=col39 契約書完工
      m1: toISO(row2[18]),           // S列=col19 図面確定
      m2: '',                        // 仕様打合せ開始 手動運用
      m3: toISO(row2[16]),           // Q列=col17 仕様確定
      m4: toISO(row2[26]),           // AA列=col27 確認提出
      m5: toISO(row2[27]),           // AB列=col28 確認許可
      m6: toISO(row2[19]),           // T列=col20 社内打合
      m7: toISO(row2[20]) || toISO(row2[21]),  // U/V ANDPAD
      m8: toISO(row2[32]),           // AG列=col33 実際着工
      afinish: toISO(row2[41]),      // AP列=col42 完工実績
      camt: 0, bclose: '', bamt: 0, acost: 0, gm: 0,
    };

    out.push(proj);
  }
  return out;
}

// 原価管理（新築）シートを既存Projectとマージ
export function mergeBudgetData(projects: Project[], rows: any[][]): void {
  // R16ヘッダー、R17サブヘッダー、R18から物件データ
  for (let r = 17; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = cellStr(row[0]); // A列=col1 現場名
    if (!name || name === '#DIV/0!') continue;
    // 名前正規化（"様邸" "ひなた" などを除去してマッチしやすく）
    const key = name.replace(/様邸|\s+|　+|ひなた|注文|建売|モデル/g, '');
    const match = projects.find(p => {
      const pk = p.name.replace(/様邸|\s+|　+|ひなた|注文|建売|モデル/g, '');
      return pk && key && (pk.includes(key.slice(0, 3)) || key.includes(pk.slice(0, 3)));
    });
    if (!match) continue;

    match.kx = cellStr(row[3]) || match.kx;   // D列 工務
    match.gm = cellNum(row[4]) * 100;         // E列 粗利率 → %
    match.camt = Math.round(cellNum(row[9]) / 10000);   // J列 契約金 → 万円
    match.bclose = toISO(row[15]);            // P列 予算〆日
    match.bamt = Math.round(cellNum(row[16]) / 10000);  // Q列 積算予算
    match.acost = Math.round(cellNum(row[18]) / 10000); // S列 請求額
  }
}

// 45期 店舗集計シート → ADV別月次目標
export function parseTargetsSheet(rows: any[][]): Record<string, number[]> {
  const targets: Record<string, number[]> = {};
  // ヘッダー数行の後、担当者ごとに「目標」「実績」の2行
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const label = cellStr(row[0]);
    // 「◯◯ 目標」パターンをキャッチ
    const m = label.match(/^(.+?)\s*目標$/);
    if (!m) continue;
    const adv = m[1].trim();
    if (adv === '店舗合計' || adv === '合計') continue;
    // 9月〜8月の12ヶ月分を C〜N列（col3〜col14）から取得
    const arr: number[] = [];
    for (let c = 2; c <= 13; c++) {
      arr.push(cellNum(row[c]));
    }
    if (arr.some(v => v > 0)) targets[adv] = arr;
  }
  return targets;
}
