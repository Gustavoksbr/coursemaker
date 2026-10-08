// /sitemap.xml (veja o rewrite no vercel.json): lista o conteudo publico consultando a API, com cache na CDN.
const { buildSitemap } = require('./_lib/seo')

module.exports = async (req, res) => {
  const xml = await buildSitemap()
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.end(xml)
}
