#!/usr/bin/env python3
"""Serve the deck locally, or refresh its manifest for static hosting."""
import argparse
import json
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


def slide_names():
    def key(name):
        return [int(part) if part.isdigit() else part.casefold()
                for part in re.split(r'(\d+)', name)]
    return sorted((p.name for p in (ROOT / 'slide').glob('*.md')), key=key)


def manifest():
    return (json.dumps(slide_names(), ensure_ascii=False, indent=2) + '\n').encode()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == '/slide/index.json':
            body = manifest()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', nargs='?', choices=['serve', 'build'], default='serve')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--bind', default='0.0.0.0')
    args = parser.parse_args()
    if args.command == 'build':
        (ROOT / 'slide' / 'index.json').write_bytes(manifest())
        print(f'Elenco aggiornato: {len(slide_names())} file Markdown.')
    else:
        server = ThreadingHTTPServer((args.bind, args.port), partial(Handler, directory=str(ROOT)))
        print(f'Presentazione: http://localhost:{args.port} — Ctrl+C per terminare.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == '__main__':
    main()
