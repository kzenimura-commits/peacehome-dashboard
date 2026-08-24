// Google Sheets 読取クライアント（サービスアカウント認証）
import { google, sheets_v4 } from 'googleapis';

let cachedClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY が未設定です');
  }

  // Vercel環境変数で \n が文字列として保存されている場合を復元
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

export async function readRange(
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const client = getSheetsClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  return (res.data.values as any[][]) || [];
}
