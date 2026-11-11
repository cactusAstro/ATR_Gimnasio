"""Perfil ligero frente a completo en una escena del motor: errores, fases, shaders y luz media por plano.
Uso: comparar3d.py <url> <n_planos>"""
import sys, json, base64
from playwright.sync_api import sync_playwright
url, nplanos = sys.argv[1], int(sys.argv[2])
LUM = """async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 120; c.height = 160; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 120, 160); const d = x.getImageData(0, 0, 120, 160).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2]; n++; } return s / n; }"""
OCULTAR = '.gym3d-ui, .escena3d-ui, .barra-pestanas, .atr-nav, .fab, .carrito-flotante, .chat-widget, .pg-indice { visibility: hidden !important }'
res = {}
with sync_playwright() as p:
    nav = p.chromium.launch(args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    aux = nav.new_page()
    for perfil, tactil in (('completo', False), ('ligero', True)):
        ctx = nav.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=tactil, has_touch=tactil, reduced_motion='reduce')
        pg = ctx.new_page(); errores = []
        pg.on('pageerror', lambda e: errores.append(str(e)[:160]))
        pg.on('console', lambda m: errores.append('consola: ' + m.text[:160]) if m.type == 'error' else None)
        pg.goto(url + '?3d=auto&diagnostico', wait_until='load'); pg.wait_for_timeout(1200)
        pg.evaluate("document.querySelector('.escena3d').scrollIntoView({ block: 'center', behavior: 'instant' })")
        pg.wait_for_function("!!document.querySelector('.escena3d-lista')", timeout=120000, polling=250)
        pg.wait_for_timeout(2500)
        diag = pg.evaluate('window.ATR3D_diag')
        pg.add_style_tag(content=OCULTAR)
        lum = []
        for i in range(nplanos):
            pg.evaluate("(i) => document.querySelector('.escena3d-planos button[data-plano=\"' + i + '\"]').click()", i)
            pg.wait_for_timeout(700)
            lum.append(round(aux.evaluate(LUM, base64.b64encode(pg.locator('.escena3d').first.screenshot()).decode()), 1))
        res[perfil] = (diag, lum, errores)
        ctx.close()
    nav.close()
c, l = res['completo'], res['ligero']
for perfil, (d, lum, err) in res.items():
    f = dict(d['fases'])
    print(f"  {perfil:9} programas {d['programas']:3} · shaders {d['fuente_kb']:5} KB · montaje {d['fases'][-1][1]:5} ms (shaders {f['shaders'] - f['postproceso']} ms) · luz {lum} · errores {err[:2]}")
dev = sum(abs(a - b) / max(b, 1) for a, b in zip(l[1], c[1])) / len(c[1]) * 100
print(f"  ligero vs completo: shaders {round((1 - l[0]['fuente_kb'] / c[0]['fuente_kb']) * 100)} % menos · luz media {dev:.1f} % de desvío")
