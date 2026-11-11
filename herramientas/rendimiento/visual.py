"""Diferencias visuales main → rama con pixelmatch, sección a sección (cada sección arriba del todo).
Uso: visual.py <base> <antes> <después> <página> <móvil|escritorio> <carpeta-salida>"""
import sys, os, json, base64
from playwright.sync_api import sync_playwright
base, va, vd, pag, modo, out = sys.argv[1:7]
os.makedirs(out, exist_ok=True)
PM = open(sys.path[0] + '/vendor/pixelmatch.js', encoding='utf-8').read()
kw = dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True) if modo == 'móvil' else dict(viewport={'width': 1280, 'height': 800})
FIJAR = "html { scroll-behavior: auto !important } *, *::before, *::after { caret-color: transparent !important }"
def capturar(nav, ver):
    ctx = nav.new_context(reduced_motion='reduce', **kw); pg = ctx.new_page()
    pg.goto(f'{base}/{ver}/{pag}', wait_until='load'); pg.wait_for_timeout(3000); pg.add_style_tag(content=FIJAR)
    ids = pg.evaluate("[...document.querySelectorAll('body > section[id], main > section[id], body > footer')].map(s => s.id || 'pie')")
    fotos = {}
    for i in ids:
        sel = '#' + i if i != 'pie' else 'body > footer'
        for _ in range(3):   # con content-visibility (main) la sección se mueve al pintarse: se reencuadra
            pg.evaluate("(s) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY); }", sel); pg.wait_for_timeout(350)
        fotos[i] = pg.screenshot()
    ctx.close(); return fotos
with sync_playwright() as p:
    nav = p.chromium.launch(args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    A, D = capturar(nav, va), capturar(nav, vd)
    aux = nav.new_page(); aux.add_script_tag(content='var module = { exports: {} };' + PM + '; window.pixelmatch = module.exports;')
    filas = []
    for i in A:
        if i not in D: filas.append((i, None)); continue
        r = aux.evaluate("""async ([a, b]) => {
            const carga = async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
            const A = await carga(a), B = await carga(b); const w = A.width, h = A.height;
            const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const dif = x.createImageData(w, h);
            const n = pixelmatch(A.data, B.data, dif.data, w, h, { threshold: 0.1 });
            x.putImageData(dif, 0, 0); return [n / (w * h), c.toDataURL('image/png').split(',')[1]]; }""", [base64.b64encode(A[i]).decode(), base64.b64encode(D[i]).decode()])
        filas.append((i, r[0]))
        if r[0] > float(os.environ.get("UMBRAL", ".02")):
            open(f'{out}/{pag}-{modo}-{i}-dif.png', 'wb').write(base64.b64decode(r[1]))
            open(f'{out}/{pag}-{modo}-{i}-antes.png', 'wb').write(A[i]); open(f'{out}/{pag}-{modo}-{i}-despues.png', 'wb').write(D[i])
    nav.close()
v = [x for _, x in filas if x is not None]
print(f'{pag} · {modo}: {len(filas)} secciones · iguales (<0,5 %) {sum(x < .005 for x in v)} · media {sum(v) / len(v) * 100:.2f} % de píxeles distintos · máx {max(v) * 100:.1f} %')
print('   ' + ' · '.join(f'{i} {x * 100:.1f}%' if x is not None else f'{i} FALTA' for i, x in filas if x is None or x >= .005))
