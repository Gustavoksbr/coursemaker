// Funcao da Vercel: recebe so os robos de prévia/busca (ver os "rewrites" com o cabecalho user-agent no
// vercel.json) e devolve um HTML com as tags do conteudo pedido. Pessoas continuam recebendo a SPA.
const { buildPage } = require('./_lib/seo')

module.exports = async (req, res) => {
  const { kind, nickname, slug } = req.query
  const params = {}
  if (nickname !== undefined) params.nickname = String(nickname)
  if (slug !== undefined) params.slug = String(slug)

  const page = await buildPage(String(kind), params)
  res.statusCode = page.status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', page.cache)
  res.end(page.html)
}
