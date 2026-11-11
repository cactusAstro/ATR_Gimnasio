"""Fotogramas largos (LoAF ≥ 50 ms) al recorrer la página entera, con quién los causa. Uso: loaf.py <url> <cpu>"""
import sys, json
from playwright.sync_api import sync_playwright
url, cpu = sys.argv[1], float(sys.argv[2])
with sync_playwright() as p:
    nav = p.chromium.launch(args=['--use-angle=metal', '--ignore-gpu-blocklist'])
    ctx = nav.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); c = ctx.new_cdp_session(pg); c.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(4500)
    pg.evaluate("""() => { window.__loaf = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__loaf.push({
        t: Math.round(e.startTime), d: Math.round(e.duration), bloqueo: Math.round(e.blockingDuration), y: Math.round(scrollY),
        estilo: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
        render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
        scripts: e.scripts.map(s => [Math.round(s.duration), Math.round(s.forcedStyleAndLayoutDuration), s.invokerType, s.invoker.slice(0, 50), (s.sourceURL || '').split('/').pop() + ':' + s.sourceFunctionName]) }))).observe({ type: 'long-animation-frame' }); }""")
    pg.evaluate("""() => new Promise(fin => { document.documentElement.style.scrollBehavior = 'auto'; let y = 0, ult = 0;
        const paso = t => { const dt = ult ? Math.min(t - ult, 50) : 16; ult = t; y += 2400 * dt / 1000; scrollTo(0, y);
            if (y < document.documentElement.scrollHeight - innerHeight) requestAnimationFrame(paso); else fin(); }; requestAnimationFrame(paso); })""")
    pg.wait_for_timeout(500)
    L = pg.evaluate('window.__loaf')
    nav.close()
L.sort(key=lambda e: -e['d'])
print(f'{len(L)} fotogramas largos (≥50 ms); los peores:')
for e in L[:8]:
    print(f"  {e['d']:4} ms (bloqueo {e['bloqueo']}, estilo+maquetación {e['estilo']}, render {e['render']}) en y={e['y']}")
    for s in sorted(e['scripts'], key=lambda s: -s[0])[:3]: print(f"      script {s[0]} ms (forzado {s[1]}) {s[2]} «{s[3]}» {s[4]}")
