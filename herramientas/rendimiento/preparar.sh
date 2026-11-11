#!/bin/zsh
# Prepara el laboratorio de medidas en una carpeta de trabajo FUERA de la web.
#   herramientas/rendimiento/preparar.sh <carpeta>          copias de la web + dos servidores locales
#   herramientas/rendimiento/preparar.sh <carpeta> parar    apaga los servidores
# Copias (sin .git): «antes» = la web publicada antes de este trabajo (commit 13f1abf) y «despues» = la carpeta
# tal como está ahora, con los cambios sin confirmar. Los servidores escuchan SOLO en este ordenador (127.0.0.1):
#   8770 sin comprimir · 8771 con gzip, como GitHub Pages (para las medidas de carga)
set -e
AQUI="${0:A:h}"
REPO="$(git -C "$AQUI" rev-parse --show-toplevel)"
LAB="${1:?Uso: preparar.sh <carpeta-de-trabajo> [parar]}"
pkill -f "http.server 8770 --bind 127.0.0.1" 2>/dev/null || true
pkill -f "servidor_gzip.py .* 8771" 2>/dev/null || true
[ "$2" = "parar" ] && { echo "Servidores apagados."; exit 0; }
mkdir -p "$LAB/snap"
rm -rf "$LAB/snap/antes" && mkdir -p "$LAB/snap/antes" && git -C "$REPO" archive "${ANTES:-13f1abf}" | tar -x -C "$LAB/snap/antes"
rm -rf "$LAB/snap/despues" && mkdir -p "$LAB/snap/despues" && rsync -a --exclude .git --exclude .claude --exclude .github --exclude vendor "$REPO/" "$LAB/snap/despues/"
(cd "$LAB/snap" && nohup python3 -m http.server 8770 --bind 127.0.0.1 >/dev/null 2>&1 &)
(nohup python3 "$AQUI/servidor_gzip.py" "$LAB/snap" 8771 >/dev/null 2>&1 &)
sleep 1
echo "Copias en $LAB/snap (antes, despues)"
echo "http://127.0.0.1:8770/despues/index.html   (sin comprimir)"
echo "http://127.0.0.1:8771/despues/index.html   (gzip)"
