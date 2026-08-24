// Basic認証のチェック（API endpoint用フォールバック）
import type { VercelRequest } from '@vercel/node';

export function checkBasicAuth(req: VercelRequest): boolean {
  const username = process.env.APP_USERNAME || 'peacehome';
  const password = process.env.APP_PASSWORD;
  if (!password) return true; // パスワード未設定なら通す（初期セットアップ時のみ）

  const authorization = req.headers['authorization'];
  if (!authorization || typeof authorization !== 'string') return false;

  const [scheme, encoded] = authorization.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [inputUser, inputPass] = decoded.split(':');
    return inputUser === username && inputPass === password;
  } catch {
    return false;
  }
}
