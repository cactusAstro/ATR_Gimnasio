"""axe-core (WCAG 2.1 A/AA + buenas prácticas) en main y en la rama; avisa de reglas nuevas o con más elementos.
Uso: axe.py <base> <versión-antes> <versión-después> <página>..."""
import sys, json
from playwright.sync_api import sync_playwright
base, va, vd, paginas = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
AXE = open(sys.path[0] + '/vendor/axe.min.js', encoding='utf-8').read()
CTX = {'móvil': dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True),
       'escritorio': dict(viewport={'width': 1280, 'height': 800})}
def correr(nav, url, kw):
    ctx = nav.new_context(reduced_motion='reduce', **kw); pg = ctx.new_page()
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(3500)
    pg.add_script_tag(content=AXE)
    r = pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] });
        return r.violations.map(v => ({ id: v.id, impacto: v.impact, n: v.nodes.length, ej: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })); }""")
    ctx.close(); return {v['id']: v for v in r}
total_nuevas = 0
with sync_playwright() as p:
    nav = p.chromium.launch()
    for pag in paginas:
        for nombre, kw in CTX.items():
            a, d = correr(nav, f'{base}/{va}/{pag}', kw), correr(nav, f'{base}/{vd}/{pag}', kw)
            nuevas = [(k, d[k]['impacto'], (a[k]['n'] if k in a else 0), d[k]['n'], d[k]['ej']) for k in d if k not in a or d[k]['n'] > a[k]['n']]
            arregladas = [k for k in a if k not in d]
            total_nuevas += len(nuevas)
            print(f'{pag:18} {nombre:10} antes {len(a):2} reglas ({sum(v["n"] for v in a.values())} elementos) · después {len(d):2} reglas ({sum(v["n"] for v in d.values())} elementos)'
                  + (f' · NUEVAS/PEORES: {nuevas}' if nuevas else ' · sin nuevas') + (f' · arregladas: {arregladas}' if arregladas else ''))
    nav.close()
print('TOTAL reglas nuevas o peores:', total_nuevas)
