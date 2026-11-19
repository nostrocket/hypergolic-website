"""Verify the static files GitHub Pages will serve at the custom domain."""

from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name in ("href", "src"):
            if attrs.get(name):
                self.urls.append(attrs[name])
        for candidate in attrs.get("srcset", "").split(","):
            if candidate.strip():
                self.urls.append(candidate.split()[0])
        if attrs.get("property") == "og:image":
            self.urls.append(attrs["content"])
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonical = attrs.get("href")


dist = Path(__file__).resolve().parents[1] / "dist"
origin = "https://hypergolic.space/"
if (dist / "CNAME").read_text().strip() != urlsplit(origin).hostname:
    raise SystemExit("dist/CNAME must contain hypergolic.space")

home = Page()
home.feed((dist / "index.html").read_text())
if home.canonical != origin:
    raise SystemExit(f"Expected the homepage canonical URL to be {origin}")

references = [(origin, url) for url in home.urls]
for css in dist.rglob("*.css"):
    stylesheet = urljoin(origin, css.relative_to(dist).as_posix())
    for url in re.findall(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""", css.read_text()):
        references.append((stylesheet, url))

for source, ref in references:
    target = urlsplit(urljoin(source, ref))
    if target.netloc != urlsplit(origin).netloc:
        continue
    path = dist / unquote(target.path).lstrip("/")
    if path.is_dir():
        path = path / "index.html"
    if not path.is_file() or not path.stat().st_size:
        raise SystemExit(f"Missing or empty file for {ref} referenced by {source}")

print("Pages entry point, custom domain and linked site assets verified.")
