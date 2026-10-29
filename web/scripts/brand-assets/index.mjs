/**
 * Gera a imagem de prévia de links (og-image.png, 1200x630) e os ícones PNG de web/public a partir de HTML,
 * no visual do design/ (preto quente, âmbar e IBM Plex). O favicon.svg é escrito à mão e serve de base aos ícones.
 *
 *   npm run brand:assets              # grava em web/public (precisa de internet para as fontes do Google)
 *
 * O navegador do Playwright precisa estar instalado (npx playwright install chromium).
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public')
const FAVICON = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8')

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;600;700&display=block" rel="stylesheet">'

const OG = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #0e0f0c; color: #ecebe4; font-family: 'IBM Plex Sans', sans-serif; }
  .grid { position: absolute; inset: 0;
    background-image: linear-gradient(#1d1f1a 1px, transparent 1px), linear-gradient(90deg, #1d1f1a 1px, transparent 1px);
    background-size: 40px 40px; mask-image: radial-gradient(ellipse 80% 90% at 70% 40%, #000 30%, transparent 85%); }
  .wrap { position: relative; height: 100%; padding: 56px 72px; display: grid; grid-template-columns: 1fr 430px; gap: 56px; }
  .mono { font-family: 'IBM Plex Mono', monospace; }
  .logo { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; display: flex; align-items: center; }
  .logo .slash { color: #f5a524; }
  .logo .cursor { display: inline-block; width: 14px; height: 30px; margin-left: 4px; background: #f5a524; }
  .left { display: flex; flex-direction: column; }
  .tag { margin-top: 64px; font-size: 19px; color: #6c6f65; }
  .tag b { color: #8fd16a; font-weight: 400; }
  h1 { margin-top: 18px; font-size: 62px; line-height: 1.04; font-weight: 700; letter-spacing: -0.035em; }
  h1 s { color: #6c6f65; font-weight: 600; text-decoration-color: #f5a524; text-decoration-thickness: 4px; }
  .foot { margin-top: auto; font-size: 19px; color: #a4a69c; }
  .foot .url { color: #ecebe4; }
  .foot .dot { color: #3a3e35; margin: 0 10px; }
  .panel { align-self: center; margin-top: 40px; border: 1px solid #2a2d26; border-radius: 6px; background: #141612; overflow: hidden; font-size: 17px; }
  .bar { display: flex; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #2a2d26; color: #6c6f65; }
  .bar b { color: #ecebe4; font-weight: 500; }
  .prog { display: inline-block; width: 70px; height: 4px; margin-left: 10px; vertical-align: middle; background: #2a2d26; border-radius: 2px; }
  .prog i { display: block; width: 30%; height: 100%; background: #8fd16a; border-radius: 2px; }
  .tabs { display: flex; border-bottom: 1px solid #2a2d26; color: #6c6f65; }
  .tabs span { padding: 11px 18px; }
  .tabs .on { color: #ecebe4; box-shadow: inset 0 -2px #f5a524; }
  pre { padding: 18px; background: #1b1d18; font-family: inherit; line-height: 1.75; color: #ecebe4; }
  .n { color: #3a3e35; display: inline-block; width: 26px; }
  .c { color: #6c6f65; font-style: italic; } .k { color: #c792ea; } .v { color: #f5a524; } .f { color: #7aa2d6; } .s { color: #8fd16a; }
  .run { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-top: 1px solid #2a2d26; }
  .btn { background: #f5a524; color: #1a1305; font-weight: 600; padding: 8px 16px; border-radius: 4px; }
  .out { padding: 0 18px 16px; color: #a4a69c; line-height: 1.6; }
  .out .ok { color: #8fd16a; }
</style></head><body><div class="grid"></div><div class="wrap">
  <div class="left">
    <div class="logo mono">course<span class="slash">/</span>maker<span class="cursor"></span></div>
    <p class="tag mono"><b>●</b> gratuito · sem anúncio · open source</p>
    <h1>Aquela <s>playlist de 87 vídeos</s> virou um curso de verdade.</h1>
    <p class="foot mono">cursos<span class="dot">·</span>trilhas<span class="dot">·</span>exercícios em 12 linguagens<br>
      <span class="url">coursemakerbr.vercel.app</span></p>
  </div>
  <div class="panel mono">
    <div class="bar"><span>lógica / <b>aula 07</b></span><span>7/27<span class="prog"><i></i></span></span></div>
    <div class="tabs"><span>▸ vídeo</span><span class="on">tabuada.py</span></div>
<pre><span class="n">1</span><span class="c"># tabuada do 7</span>
<span class="n">2</span><span class="k">for</span> i <span class="k">in</span> <span class="f">range</span>(<span class="v">1</span>, <span class="v">4</span>):
<span class="n">3</span>    <span class="f">print</span>(<span class="s">f"{i} x 7 = {i * 7}"</span>)</pre>
    <div class="run"><span class="btn">▶ executar</span><span style="color:#6c6f65">python 3.12</span></div>
    <div class="out">$ 1 x 7 = 7<br>$ 2 x 7 = 14<br>$ 3 x 7 = 21 <span class="ok">✓</span></div>
  </div>
</div></body></html>`

const icon = (size) =>
  `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;overflow:hidden;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${FAVICON}</body></html>`

const browser = await chromium.launch()

async function render(html, file, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(PUBLIC, file), omitBackground: true })
  await page.close()
  console.log('ok', file)
}

await render(OG, 'og-image.png', 1200, 630)
for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon-32x32.png', 32]]) {
  await render(icon(size), file, size, size)
}
await browser.close()
