"""Renderiza las imágenes previas del 3D con el mismo perfil ligero (contexto táctil) y las guarda en WebP.
Uso: posters.py <url-página> <selector> <salida-sin-extensión> [calidad]"""
import sys, base64
from playwright.sync_api import sync_playwright
url, selector, salida = sys.argv[1], sys.argv[2], sys.argv[3]
q = float(sys.argv[4]) if len(sys.argv) > 4 else .82
TAM = {'vertical': (375, 667), 'horizontal': (1024, 768)}
OCULTAR = ('.gym3d-ui, .escena3d-ui, .barra-pestanas, .atr-nav, .fab, .carrito-flotante, .chat-widget, .pg-indice, .atr3d-aviso'
           ' { visibility: hidden !important } .gym3d-canvas, .escena3d-canvas { transition: none !important }'
           ' .gym3d, .escena3d { border-color: transparent !important; border-radius: 0 !important }')
with sync_playwright() as p:
    nav = p.chromium.launch(args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    aux = nav.new_page()
    for nombre, (w, h) in TAM.items():
        ctx = nav.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1.5, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        errores = []
        pg.on('pageerror', lambda e: errores.append(str(e)[:160]))
        pg.goto(url + ('&' if '?' in url else '?') + '3d=auto', wait_until='load')
        pg.wait_for_timeout(1500)
        pg.evaluate("(s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' })", selector)
        pg.wait_for_function("!!document.querySelector('.gym3d-listo, .escena3d-lista')", timeout=120000, polling=250)
        pg.add_style_tag(content=OCULTAR)
        pg.wait_for_timeout(3000)
        png = pg.locator(selector + '-canvas').first.screenshot()
        caja = pg.evaluate("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }", selector)
        webp = aux.evaluate("""async ([b64, q]) => {
            const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
            const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            return [c.toDataURL('image/webp', q).split(',')[1], img.naturalWidth, img.naturalHeight];
        }""", [base64.b64encode(png).decode(), q])
        datos = base64.b64decode(webp[0])
        open(f'{salida}-{nombre}.webp', 'wb').write(datos)
        print(f'{nombre:10} caja {caja[0]}×{caja[1]} CSS · imagen {webp[1]}×{webp[2]} · {len(datos) // 1024} KB · errores {errores[:2]}')
        ctx.close()
    nav.close()
