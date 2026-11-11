#!/usr/bin/env python3
"""Peso visual de la página en táctil: qué efectos caros hay en pantalla en cada posición del scroll.

Dos familias de coste (cada una con su propia unidad, para poder compararlas antes y después):
  POR FOTOGRAMA (la GPU lo repite mientras algo se mueve detrás): backdrop-filter y filter: blur
      coste = área visible (px²) × (radio de desenfoque + 4)
  DE PINTADO (la CPU lo pinta una vez por cada trozo que entra en pantalla): sombras con desenfoque ≥ 12 px,
      máscaras y bordes de degradado cónico
      coste = área de la sombra (px²) × radio, o área de la máscara
Uso: auditoria.py <url> [--motor chromium] [--paso 500]
"""
import argparse
import json
import statistics as st

from playwright.sync_api import sync_playwright

JS = r"""
() => {
  const vw = innerWidth, vh = innerHeight;
  const vis = r => { const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); return w * h; };
  const nombre = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + String(e.className && e.className.baseVal === undefined ? '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.') : '');
  const blur = v => { const m = /blur\(([\d.]+)px\)/.exec(v || ''); return m ? +m[1] : 0; };
  const sombras = v => { if (!v || v === 'none') return []; const out = []; v.split(/,(?![^(]*\))/).forEach(s => { if (/inset/.test(s)) return; const n = s.match(/-?[\d.]+px/g) || []; if (n.length >= 3) out.push(+n[2].replace('px', '')); }); return out; };
  const res = { frame: 0, pintado: 0, n_backdrop: 0, n_filtro: 0, n_sombra: 0, n_mascara: 0, n_cono: 0, n_will: 0, n_fijos: 0, top: [] };
  const sumar = (tipo, e, area, coste, extra) => { res.top.push([coste, tipo, nombre(e), Math.round(area), extra]); };
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const area = vis(r);
    if (area === 0) continue;
    if (cs.position === 'fixed') res.n_fijos++;
    if (cs.willChange && cs.willChange !== 'auto') res.n_will++;
    const bd = cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none' ? cs.webkitBackdropFilter : '');
    if (bd) { const c = area * (blur(bd) + 4); res.frame += c; res.n_backdrop++; sumar('backdrop', e, area, c, bd.slice(0, 40)); }
    if (cs.filter && cs.filter !== 'none' && blur(cs.filter)) { const c = area * blur(cs.filter); res.frame += c; res.n_filtro++; sumar('filtro', e, area, c, cs.filter.slice(0, 30)); }
    const ss = sombras(cs.boxShadow).filter(b => b >= 12);
    if (ss.length) { const b = Math.max(...ss); const c = (r.width + 2 * b) * (r.height + 2 * b) * b; res.pintado += c; res.n_sombra++; sumar('sombra', e, area, c, 'blur ' + b + 'px'); }
    for (const ps of ['::before', '::after']) {
      const p = getComputedStyle(e, ps);
      if (!p || p.content === 'none' || p.content === 'normal' || p.display === 'none') continue;
      const m = p.maskImage && p.maskImage !== 'none' ? 1 : (p.webkitMaskImage && p.webkitMaskImage !== 'none' ? 1 : 0);
      if (m) { res.pintado += area * 20; res.n_mascara++; sumar('máscara', e, area, area * 20, ps); }
      if (/conic-gradient/.test(p.backgroundImage || '')) { res.n_cono++; sumar('cónico', e, area, area * 6, ps); res.pintado += area * 6; }
    }
  }
  res.top.sort((a, b) => b[0] - a[0]);
  res.top = res.top.slice(0, 8);
  return res;
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('url')
    ap.add_argument('--motor', default='chromium')
    ap.add_argument('--paso', type=int, default=500)
    ap.add_argument('--escritorio', action='store_true')
    ap.add_argument('--json', default=None)
    a = ap.parse_args()
    with sync_playwright() as p:
        nav = {'chromium': p.chromium, 'webkit': p.webkit}[a.motor].launch()
        kw = dict(viewport={'width': 1280, 'height': 800}, device_scale_factor=2) if a.escritorio else dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx = nav.new_context(**kw)
        pg = ctx.new_page()
        pg.goto(a.url, wait_until='load')
        pg.wait_for_timeout(5000)
        alto = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
        filas = []
        for y in range(0, int(alto) + 1, a.paso):
            pg.evaluate("(y) => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); }", y)
            pg.wait_for_timeout(120)
            r = pg.evaluate(JS)
            r['y'] = y
            filas.append(r)
        nav.close()
    vp = 375 * 667
    f = [r['frame'] / vp for r in filas]
    q = [r['pintado'] / vp for r in filas]
    print(f'{a.url}  ({len(filas)} posiciones, página de {int(alto)} px, {"escritorio" if a.escritorio else "móvil táctil"})')
    print(f'  POR FOTOGRAMA  (backdrop + blur, en pantallas completas equivalentes): media {st.mean(f):.2f} · p90 {sorted(f)[int(len(f) * .9)]:.2f} · máx {max(f):.2f}')
    print(f'  DE PINTADO     (sombras, máscaras, cónicos): media {st.mean(q):.2f} · p90 {sorted(q)[int(len(q) * .9)]:.2f} · máx {max(q):.2f}')
    for k in ['n_backdrop', 'n_filtro', 'n_sombra', 'n_mascara', 'n_cono', 'n_will', 'n_fijos']:
        v = [r[k] for r in filas]
        print(f'  {k:11} media {st.mean(v):5.1f} · máx {max(v)}')
    from collections import Counter
    cuenta = Counter()
    for r in filas:
        for c, tipo, nom, area, extra in r['top']:
            cuenta[(tipo, nom[:46], extra)] += 1
    print('  lo que más aparece entre los peores de cada posición:')
    for (tipo, nom, extra), n in cuenta.most_common(9):
        print(f'     {n:3d}×  {tipo:9} {nom:46} {extra}')
    if a.json:
        json.dump(filas, open(a.json, 'w'))


if __name__ == '__main__':
    main()
