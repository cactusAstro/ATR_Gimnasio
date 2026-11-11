#!/usr/bin/env python3
"""Laboratorio de rendimiento de ATR-GYM (Playwright: Chromium con CPU ralentizada y WebKit).

Escenarios (cada uno en un contexto limpio, repetido N veces; se informa mediana, mínimo y máximo):
  carga     carga en frío de la portada: FCP, LCP, listo (fin de la pantalla de carga), tareas largas, TBT
  salto     toque en un botón de la barra de abajo: tiempo hasta llegar y cadencia de fotogramas
  scroll    scroll continuo de arriba abajo a 2.400 px/s: cadencia de fotogramas y trabajo del hilo principal
  menu      toque en la hamburguesa: cadencia mientras se abre
  3d        montaje de la escena 3D (portada o disciplina): tiempo hasta lista, tareas largas, programas WebGL
Uso:
  python lab.py <escenario> <url> --motor chromium|webkit --cpu 4 --pasadas 5 --etiqueta nombre
  (--red lighthouse|4g|lenta en «carga»; --desde, --arriba, --selector y --destino en «salto»; ver LEEME.md)
"""
import argparse
import json
import os
import statistics as st
import sys
import time

from playwright.sync_api import sync_playwright

UA_IPHONE = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
             'Version/18.6 Mobile/15E148 Safari/604.1')

INIT = r"""
(() => {
  if (window.__m) return;
  const m = window.__m = { lt: [], loaf: [], paint: {}, lcp: null, cls: 0, listo: null, sinPre: null,
    gl: { prog: 0, linkMs: 0, statusMs: 0, tex: 0, texMs: 0, mip: 0, mipMs: 0, compile: 0, compileMs: 0 } };
  const po = (type, fn) => { try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch (e) {} };
  po('longtask', e => m.lt.push([Math.round(e.startTime), Math.round(e.duration)]));
  po('long-animation-frame', e => m.loaf.push([Math.round(e.startTime), Math.round(e.duration), Math.round(e.blockingDuration || 0)]));
  po('paint', e => { m.paint[e.name] = Math.round(e.startTime); });
  po('largest-contentful-paint', e => { m.lcp = Math.round(e.startTime); m.lcpEl = (e.element ? e.element.tagName.toLowerCase() + '.' + String(e.element.className).trim().split(/\s+/).slice(0, 2).join('.') : '') + ' ' + (e.url || '').split('/').pop().slice(0, 40); });
  po('layout-shift', e => { if (!e.hadRecentInput) m.cls += e.value; });
  const ver = () => {
    if (m.listo === null && document.body && document.body.classList.contains('listo')) m.listo = Math.round(performance.now());
    if (m.sinPre === null && document.readyState !== 'loading' && document.body && !document.getElementById('preloader')) m.sinPre = Math.round(performance.now());
  };
  new MutationObserver(ver).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  const envolver = proto => {
    if (!proto || proto.__env) return; proto.__env = true;
    const t = (nombre, fn) => { const o = proto[nombre]; if (!o) return; proto[nombre] = function (...a) { const s = performance.now(); try { return o.apply(this, a); } finally { fn(performance.now() - s); } }; };
    t('linkProgram', d => { m.gl.prog++; m.gl.linkMs += d; });
    t('compileShader', d => { m.gl.compile++; m.gl.compileMs += d; });
    t('getProgramParameter', d => { m.gl.statusMs += d; });
    t('texImage2D', d => { m.gl.tex++; m.gl.texMs += d; });
    t('texSubImage2D', d => { m.gl.tex++; m.gl.texMs += d; });
    t('generateMipmap', d => { m.gl.mip++; m.gl.mipMs += d; });
  };
  envolver(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  envolver(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  const c = window.__cad = { iv: [], run: false, last: 0 };
  window.__cadStart = () => { c.iv = []; c.last = 0; c.run = true; const f = t => { if (!c.run) return; if (c.last) c.iv.push(t - c.last); c.last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); };
  window.__cadStop = () => { c.run = false; return c.iv; };
})();
"""

SIN_USERAGENTDATA = "try { Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined }); } catch (e) {}"

METRICAS_CDP = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount', 'JSHeapUsedSize', 'Nodes']


def percentil(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(len(v) * p / 100))] if v else float('nan')


def cadencia(iv, prefijo='fr'):
    if not iv:
        return {}
    return {
        f'{prefijo}_n': len(iv), f'{prefijo}_p50': st.median(iv), f'{prefijo}_p95': percentil(iv, 95), f'{prefijo}_max': max(iv),
        f'{prefijo}_pct33': 100 * sum(1 for x in iv if x >= 30) / len(iv), f'{prefijo}_pct50': 100 * sum(1 for x in iv if x >= 45) / len(iv),
        f'{prefijo}_paradas100': sum(1 for x in iv if x >= 95),
    }


class Sesion:
    def __init__(self, p, args):
        self.p, self.args = p, args
        lanz = {'chromium': p.chromium, 'webkit': p.webkit}[args.motor]
        extra = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] if args.motor == 'chromium' else []
        self.nav = lanz.launch(args=extra)

    def nueva(self):
        a = self.args
        kw = dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True)
        if a.motor == 'chromium':
            kw['user_agent'] = UA_IPHONE
        if a.escritorio:
            kw = dict(viewport={'width': 1280, 'height': 800}, device_scale_factor=2)
        ctx = self.nav.new_context(**kw)
        ctx.add_init_script(INIT)
        if a.motor == 'chromium' and not a.escritorio:
            ctx.add_init_script(SIN_USERAGENTDATA)   # Safari no tiene userAgentData: la página no activa lo que es solo de Chromium
        page = ctx.new_page()
        cdp = None
        if a.motor == 'chromium':
            cdp = ctx.new_cdp_session(page)
            cdp.send('Performance.enable')
            if a.cpu and a.cpu > 1:
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': a.cpu})
            if a.red:
                lat, down = {'4g': (170, 1.6e6 / 8 * 2.5), 'lenta': (400, 400e3 / 8), 'lighthouse': (150, 1.6e6 / 8)}[a.red]
                cdp.send('Network.enable')
                cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': lat, 'downloadThroughput': down, 'uploadThroughput': down / 2})
        return ctx, page, cdp

    def cerrar(self):
        self.nav.close()


def cdp_metricas(cdp):
    if not cdp:
        return {}
    return {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics'] if m['name'] in METRICAS_CDP}


def delta(a, b):
    return {k: (b[k] - a.get(k, 0)) for k in b}


def tbt(lt, desde):
    return sum(max(0, d - 50) for s, d in lt if s >= desde)


# ---------------------------------------------------------------- escenarios
def esc_carga(page, cdp, url, a):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(a.espera)
    m = page.evaluate('window.__m')
    nav = page.evaluate('(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd }; })()')
    res = page.evaluate('performance.getEntriesByType("resource").map(r => [r.transferSize || 0, r.initiatorType])')
    fcp = m['paint'].get('first-contentful-paint')
    out = {'ttfb': nav['ttfb'], 'dcl': nav['dcl'], 'load': nav['load'], 'fcp': fcp, 'lcp': m['lcp'], 'listo': m['listo'], 'sin_precarga': m['sinPre'],
           'lcp_elemento': m.get('lcpEl'), 'cls': round(m['cls'], 3), 'tareas_largas': len(m['lt']), 'tarea_mayor': max([d for s, d in m['lt']] or [0]),
           'tbt': tbt(m['lt'], fcp or 0) if m['lt'] or a.motor == 'chromium' else None,
           'peticiones': len(res), 'kb': sum(r[0] for r in res) / 1024}
    out.update(cdp_metricas(cdp))
    out['gl_programas'] = m['gl']['prog']
    return out


def esc_scroll(page, cdp, url, a):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(a.espera)
    alto = page.evaluate('document.documentElement.scrollHeight - innerHeight')
    antes = cdp_metricas(cdp)
    page.evaluate('window.__cadStart()')
    t0 = time.time()
    page.evaluate("""async (v) => { await new Promise(res => { let y = 0, ult = 0; const f = t => { const dt = ult ? Math.min(t - ult, 50) : 16; ult = t; y += v * dt / 1000;
        scrollTo({ top: y, behavior: 'instant' }); if (y < document.documentElement.scrollHeight - innerHeight) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); }""", a.velocidad)
    dur = time.time() - t0
    iv = page.evaluate('window.__cadStop()')
    out = {'alto_px': alto, 'duracion_s': round(dur, 2)}
    out.update(cadencia(iv))
    out.update({k: v for k, v in delta(antes, cdp_metricas(cdp)).items() if k not in ('JSHeapUsedSize', 'Nodes')})
    m = page.evaluate('window.__m')
    out['tareas_largas'] = len(m['lt'])
    return out


def esc_salto(page, cdp, url, a):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(a.espera)
    page.evaluate("(y) => scrollTo({ top: y, behavior: 'instant' })", a.desde)
    page.wait_for_timeout(1200 if a.desde else 600)
    sel = a.selector or '.barra-pestanas a[data-id="calculadoras"], .barra-pestanas a[href$="#calculadoras"]'
    destino = a.destino or '#calculadoras'
    caja = page.locator(sel).first.bounding_box()
    if not caja:
        return {'error': 'no hay botón en la barra de abajo'}
    antes = cdp_metricas(cdp)
    page.evaluate('window.__cadStart()')
    page.evaluate("window.__t0 = performance.now()")
    page.touchscreen.tap(caja['x'] + caja['width'] / 2, caja['y'] + caja['height'] / 2)
    # con --arriba el destino es el principio de la página (píxel 0); si no, el destino queda bajo el menú (80 px)
    objetivo = 0 if a.arriba else 80
    llego = page.evaluate("""async ([dest, obj, arriba]) => { const el = document.querySelector(dest); const t0 = window.__t0;
        return await new Promise(res => { let est = 0; const f = () => { const r = arriba ? scrollY : el.getBoundingClientRect().top; const ok = Math.abs(r - obj) < 6; est = ok ? est + 1 : 0;
          if (est >= 3) res(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 9000) res(-1); else requestAnimationFrame(f); }; requestAnimationFrame(f); }); }""", [destino, objetivo, a.arriba])
    page.wait_for_timeout(1500)
    iv = page.evaluate('window.__cadStop()')
    final = page.evaluate("([dest, arriba]) => Math.round(arriba ? scrollY : document.querySelector(dest).getBoundingClientRect().top)", [destino, a.arriba])
    out = {'llegada_ms': llego, 'error_aterrizaje_px': final - objetivo}
    out.update(cadencia(iv))
    out.update({k: v for k, v in delta(antes, cdp_metricas(cdp)).items() if k not in ('JSHeapUsedSize', 'Nodes')})
    return out


def esc_menu(page, cdp, url, a):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(a.espera)
    caja = page.locator('#atrBurger').first.bounding_box()
    antes = cdp_metricas(cdp)
    page.evaluate('window.__cadStart()')
    page.touchscreen.tap(caja['x'] + caja['width'] / 2, caja['y'] + caja['height'] / 2)
    page.wait_for_timeout(1200)
    iv = page.evaluate('window.__cadStop()')
    out = {'abierto': page.evaluate("document.getElementById('atrMenu').classList.contains('open')")}
    out.update(cadencia(iv))
    out.update({k: v for k, v in delta(antes, cdp_metricas(cdp)).items() if k not in ('JSHeapUsedSize', 'Nodes')})
    return out


def esc_3d(page, cdp, url, a):
    page.goto(url, wait_until='load')
    page.wait_for_timeout(a.espera)
    sel = a.selector or '.gym3d, .escena3d'
    listo = a.listo or '.gym3d-listo, .escena3d-lista'
    antes = cdp_metricas(cdp)
    t0 = page.evaluate("""(sel) => { const el = document.querySelector(sel); el.scrollIntoView({ block: 'center', behavior: 'instant' }); window.__t3d = performance.now(); return window.__t3d; }""", sel)
    ok = True
    try:
        page.wait_for_function("(l) => !!document.querySelector(l)", arg=listo, timeout=a.limite * 1000, polling=100)
    except Exception:
        ok = False
    t1 = page.evaluate('performance.now()')
    m = page.evaluate('window.__m')
    lt = [(s, d) for s, d in m['lt'] if s >= t0]
    out = {'lista': ok, 'hasta_lista_ms': round(t1 - t0), 'tareas_largas_3d': len(lt), 'tarea_mayor_3d': max([d for s, d in lt] or [0]),
           'tbt_3d': tbt(m['lt'], t0), 'gl_programas': m['gl']['prog'], 'gl_enlace_ms': round(m['gl']['linkMs'] + m['gl']['statusMs']),
           'gl_compila_ms': round(m['gl']['compileMs']), 'gl_texturas': m['gl']['tex'], 'gl_tex_ms': round(m['gl']['texMs'] + m['gl']['mipMs'])}
    out.update({k: v for k, v in delta(antes, cdp_metricas(cdp)).items() if k in ('TaskDuration', 'ScriptDuration')})
    if ok:
        page.wait_for_timeout(800)
        page.evaluate('window.__cadStart()')
        page.wait_for_timeout(3000)
        out.update(cadencia(page.evaluate('window.__cadStop()'), 'fps3d'))
    return out


ESCENARIOS = {'carga': esc_carga, 'scroll': esc_scroll, 'salto': esc_salto, 'menu': esc_menu, '3d': esc_3d}


def resumen(filas):
    claves = [k for k in filas[0] if all(isinstance(f.get(k), (int, float)) and not isinstance(f.get(k), bool) for f in filas)]
    out = {}
    for k in claves:
        v = [f[k] for f in filas]
        out[k] = {'med': round(st.median(v), 2), 'min': round(min(v), 2), 'max': round(max(v), 2)}
    for k in filas[0]:
        if k not in out:
            out[k] = [f.get(k) for f in filas]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('escenario', choices=ESCENARIOS)
    ap.add_argument('url')
    ap.add_argument('--motor', default='chromium', choices=['chromium', 'webkit'])
    ap.add_argument('--cpu', type=float, default=4)
    ap.add_argument('--red', choices=['4g', 'lenta', 'lighthouse'], default=None)
    ap.add_argument('--pasadas', type=int, default=5)
    ap.add_argument('--etiqueta', default='x')
    ap.add_argument('--espera', type=int, default=4500, help='ms tras la carga antes de medir')
    ap.add_argument('--velocidad', type=int, default=2400)
    ap.add_argument('--selector', default=None)
    ap.add_argument('--destino', default=None)
    ap.add_argument('--desde', type=int, default=0, help='salto: posición de scroll de la que se parte')
    ap.add_argument('--arriba', action='store_true', help='salto: se llega al alcanzar el principio de la página')
    ap.add_argument('--listo', default=None)
    ap.add_argument('--limite', type=int, default=60)
    ap.add_argument('--escritorio', action='store_true')
    ap.add_argument('--salida', default=None)
    a = ap.parse_args()
    filas = []
    with sync_playwright() as p:
        s = Sesion(p, a)
        for i in range(a.pasadas):
            ctx, page, cdp = s.nueva()
            try:
                filas.append(ESCENARIOS[a.escenario](page, cdp, a.url, a))
            except Exception as e:
                filas.append({'error': str(e)[:200]})
            ctx.close()
        s.cerrar()
    validas = [f for f in filas if 'error' not in f]
    res = {'etiqueta': a.etiqueta, 'escenario': a.escenario, 'url': a.url, 'motor': a.motor, 'cpu': a.cpu, 'pasadas': a.pasadas,
           'errores': [f['error'] for f in filas if 'error' in f], 'resumen': resumen(validas) if validas else {}, 'filas': filas}
    if a.salida:
        os.makedirs(os.path.dirname(a.salida), exist_ok=True)
        with open(a.salida, 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
    print(f'## {a.etiqueta} · {a.escenario} · {a.motor} · CPU ×{a.cpu} · {len(validas)}/{a.pasadas} pasadas · {a.url}')
    for e in res['errores'][:2]:
        print('   ERROR:', e)
    for k, v in res['resumen'].items():
        if isinstance(v, dict):
            print(f'   {k:24} {v["med"]:>10} (mín {v["min"]}, máx {v["max"]})')
        else:
            print(f'   {k:24} {v}')


if __name__ == '__main__':
    main()
