#!/usr/bin/env python3
"""
Recorta Bootstrap a lo que usa ATR-GYM y lo guarda en bootstrap-atr.css.

La portada solo usa una docena de clases de Bootstrap (márgenes, row/col-md-6,
formularios, lead…) más su «reboot», pero la hoja entera pesa unos 230 KB, venía
de otro servidor y bloqueaba el primer pintado. Este script deja las reglas sin
clases (reboot y variables) y las que solo usan clases que aparecen en algún HTML
o JS de la web; el resto se descarta. Las reglas que quedan se copian tal cual.

Uso, desde la carpeta de la web:
    curl -o /tmp/bootstrap.min.css https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css
    python3 herramientas/recortar-bootstrap.py /tmp/bootstrap.min.css

Si un día usas una clase de Bootstrap que todavía no estaba en la web, vuelve a ejecutarlo.
"""
import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'bootstrap-atr.css')


def palabras_de_la_web():
    vistas = set()
    for ruta in glob.glob(os.path.join(RAIZ, '*.html')) + glob.glob(os.path.join(RAIZ, '*.js')):
        with open(ruta, encoding='utf-8') as f:
            vistas.update(re.findall(r'[A-Za-z_][-A-Za-z0-9_]*', f.read()))
    return vistas


def saltar_cadena(css, i):
    """Devuelve la posición justo después de la cadena que empieza en css[i]."""
    comilla, j = css[i], i + 1
    while css[j] != comilla:
        j += 2 if css[j] == '\\' else 1
    return j + 1


def piezas(css):
    """Parte una hoja en piezas de primer nivel: (cabecera, cuerpo) o (sentencia, None)."""
    i, n, out = 0, len(css), []
    while i < n:
        if css[i].isspace():
            i += 1
            continue
        if css.startswith('/*', i):
            j = css.index('*/', i) + 2
            out.append((css[i:j], None))
            i = j
            continue
        j, parentesis = i, 0
        while j < n:
            c = css[j]
            if c in '"\'':
                j = saltar_cadena(css, j)
                continue
            if c == '(':
                parentesis += 1
            elif c == ')':
                parentesis -= 1
            elif c == ';' and parentesis == 0:
                out.append((css[i:j + 1], None))
                break
            elif c == '{' and parentesis == 0:
                k, nivel = j + 1, 1
                while nivel:
                    d = css[k]
                    if d in '"\'':
                        k = saltar_cadena(css, k)
                        continue
                    if css.startswith('/*', k):
                        k = css.index('*/', k) + 2
                        continue
                    nivel += (d == '{') - (d == '}')
                    k += 1
                out.append((css[i:j], css[j + 1:k - 1]))
                j = k - 1
                break
            j += 1
        i = j + 1
    return out


def partir_selectores(cabecera):
    partes, profundidad, inicio = [], 0, 0
    for i, c in enumerate(cabecera):
        if c in '([':
            profundidad += 1
        elif c in ')]':
            profundidad -= 1
        elif c == ',' and profundidad == 0:
            partes.append(cabecera[inicio:i])
            inicio = i + 1
    partes.append(cabecera[inicio:])
    return [p.strip() for p in partes if p.strip()]


def quitar_grupos(selector):
    """Quita :not(), :is(), :where() y :has() con su contenido: sus clases no son obligatorias."""
    out, i = [], 0
    while i < len(selector):
        m = re.match(r':(not|is|where|has)\(', selector[i:])
        if m:
            j, nivel = i + len(m.group(0)), 1
            while nivel:
                nivel += (selector[j] == '(') - (selector[j] == ')')
                j += 1
            i = j
            continue
        out.append(selector[i])
        i += 1
    return ''.join(out)


def clases(selector):
    sin_atributos = re.sub(r'\[[^\]]*\]', '', quitar_grupos(selector))
    return re.findall(r'\.(-?[_a-zA-Z][-_a-zA-Z0-9]*)', sin_atributos)


def recortar(css, usadas, animaciones):
    out = []
    for cabecera, cuerpo in piezas(css):
        if cuerpo is None:
            if not cabecera.startswith('/*'):
                out.append(cabecera)
            continue
        cab = cabecera.strip()
        if cab.startswith('@keyframes'):
            out.append(('@keyframes', cab.split()[1], cab + '{' + cuerpo + '}'))
        elif cab.startswith('@'):
            dentro = recortar(cuerpo, usadas, animaciones)
            if dentro.strip():
                out.append(cab + '{' + dentro + '}')
        else:
            vivos = [s for s in partir_selectores(cab) if all(c in usadas for c in clases(s))]
            if vivos:
                out.append(','.join(vivos) + '{' + cuerpo + '}')
                for valor in re.findall(r'animation(?:-name)?:([^;}]*)', cuerpo):
                    animaciones.update(re.findall(r'[-\w]+', valor))
    # los @keyframes solo se quedan si alguna regla que sigue en pie los usa
    return ''.join(p if isinstance(p, str) else (p[2] if p[1] in animaciones else '') for p in out)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8') as f:
        original = f.read()
    licencia = re.search(r'/\*!.*?\*/', original, re.S).group(0)
    version = re.search(r'v(\d+\.\d+\.\d+)', licencia).group(1)
    animaciones = set()
    cuerpo = recortar(original, palabras_de_la_web(), animaciones)
    cuerpo = cuerpo.replace('@charset "UTF-8";', '')
    nota = ('/* Recorte de Bootstrap ' + version + ' para ATR-GYM: solo el reboot, las variables y las clases '
            'que usa la web. Se regenera con herramientas/recortar-bootstrap.py */')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write('@charset "UTF-8";' + licencia + '\n' + nota + '\n' + cuerpo + '\n')
    print(f'{os.path.basename(SALIDA)}: {len(original) // 1024} KB -> {os.path.getsize(SALIDA) // 1024} KB')


if __name__ == '__main__':
    main()
