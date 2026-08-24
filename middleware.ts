// Vercel Edge Middleware — Basic認証でダッシュボード全体を保護
// APIエンドポイント含む全てのリクエストで認証を要求
export const config = {
  matcher: '/((?!_next/static|favicon.ico).*)',
};

export default function middleware(request: Request): Response | undefined {
  const username = process.env.APP_USERNAME || 'peacehome';
  const password = process.env.APP_PASSWORD;

  // APP_PASSWORD 未設定 → 認証スキップ（初期プレビュー用）
  // 本番運用時は必ず環境変数を設定してください
  if (!password) return;

  const authorization = request.headers.get('authorization');

  if (authorization) {
    const [scheme, encoded] = authorization.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = atob(encoded);
        const [inputUser, inputPass] = decoded.split(':');
        if (inputUser === username && inputPass === password) {
          return; // 認証OK：後続処理へ
        }
      } catch {
        // 不正なBase64 → 認証失敗として扱う
      }
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Peace Home Dashboard", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
