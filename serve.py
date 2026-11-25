"""Local preview that behaves like Cloudflare Pages: /work/barbershop serves work/barbershop.html,
missing pages get 404.html. Run: python serve.py [port]  (default 5530)."""
import http.server, os, sys
from pathlib import Path

ROOT = Path(__file__).parent / "site"

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".webp": "image/webp", ".mp4": "video/mp4", ".woff2": "font/woff2", ".svg": "image/svg+xml"}

    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        local = ROOT / path.lstrip("/")
        if path != "/" and not path.endswith("/") and not local.exists() and Path(str(local) + ".html").is_file():
            self.path = path + ".html" + self.path[len(path):]
        elif not local.exists() and not path.endswith("/"):
            self.path = "/404.html"
            f = super().send_head()
            return f
        return super().send_head()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 5530))
    print(f"http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
