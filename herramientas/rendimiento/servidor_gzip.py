"""Servidor estático como GitHub Pages: comprime en gzip HTML, CSS, JS, JSON y SVG. Solo en 127.0.0.1."""
import gzip, http.server, os, sys
COMPRIMIR = {'.html', '.css', '.js', '.json', '.svg', '.txt', '.webmanifest'}
class Manejador(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        ruta = self.translate_path(self.path)
        if os.path.isdir(ruta):
            ruta = os.path.join(ruta, 'index.html')
        ext = os.path.splitext(ruta)[1].lower()
        if ext in COMPRIMIR and os.path.isfile(ruta) and 'gzip' in self.headers.get('Accept-Encoding', ''):
            datos = gzip.compress(open(ruta, 'rb').read(), 6)
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(ruta))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(datos)))
            self.send_header('Cache-Control', 'max-age=600')
            self.end_headers()
            import io
            return io.BytesIO(datos)
        return super().send_head()
    def log_message(self, *a): pass
os.chdir(sys.argv[1])
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), Manejador).serve_forever()
