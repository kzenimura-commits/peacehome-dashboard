// 超シンプルなJSエンドポイント - Vercelランタイムそのものの動作確認用
module.exports = (req, res) => {
  res.status(200).json({ ping: 'pong', now: new Date().toISOString() });
};
