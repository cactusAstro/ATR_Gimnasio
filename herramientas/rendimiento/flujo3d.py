"""Flujo real en táctil: imagen previa → toque → escena lista → imagen fuera. Uso: flujo3d.py <url> <motor> <cpu> <salida.png>"""
import sys, time, json
from playwright.sync_api import sync_playwright
url, motor, cpu, salida = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
with sync_playwright() as p:
    nav = {'chromium': p.chromium, 'webkit': p.webkit}[motor].launch(args=['--use-angle=metal', '--ignore-gpu-blocklist'] if motor == 'chromium' else [])
    ctx = nav.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errores = []; peticiones = []
    pg.on('pageerror', lambda e: errores.append(str(e)[:160]))
    pg.on('console', lambda m: errores.append('consola: ' + m.text[:160]) if m.type == 'error' else None)
    pg.on('request', lambda r: peticiones.append(r.url))
    if motor == 'chromium' and cpu > 1:
        c = ctx.new_cdp_session(pg); c.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(4000)
    sel = '.gym3d' if 'index' in url else '.escena3d'
    pg.evaluate("(s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' })", sel)
    pg.wait_for_timeout(1500)
    antes = pg.evaluate("""(s) => { const c = document.querySelector(s), i = c.querySelector('.fachada-poster'), b = c.querySelector('.fachada-boton');
        return { fachada: c.classList.contains('fachada'), poster: i ? i.currentSrc.split('/').pop() : null, cargado: i ? i.complete && i.naturalWidth > 0 : false,
                 boton: b ? b.textContent : null, boton_px: b ? [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)] : null }; }""", sel)
    three_antes = any('three' in u for u in peticiones)
    pg.screenshot(path=salida.replace('.png', '-antes.png'))
    t0 = time.time()
    pg.locator(sel + ' .fachada-boton').tap()
    pg.wait_for_timeout(300)
    durante = pg.evaluate("(s) => { const b = document.querySelector(s + ' .fachada-boton'); return b ? [b.textContent, b.disabled] : null; }", sel)
    pg.wait_for_function("(s) => !!document.querySelector(s + '.gym3d-listo, ' + s + '.escena3d-lista')", arg=sel, timeout=120000, polling=100)
    listo_s = round(time.time() - t0, 2)
    pg.wait_for_timeout(1500)
    despues = pg.evaluate("(s) => { const c = document.querySelector(s); return { fachada: c.classList.contains('fachada'), restos: c.querySelectorAll('.fachada-poster, .fachada-boton').length }; }", sel)
    pg.screenshot(path=salida.replace('.png', '-despues.png'))
    print(json.dumps({'antes': antes, 'three_sin_tocar': three_antes, 'al_tocar': durante, 'listo_s': listo_s, 'despues': despues, 'errores': errores[:3]}, ensure_ascii=False))
    nav.close()
