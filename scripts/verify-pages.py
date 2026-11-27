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
        self.ids = set()
        self.domain = None
        self.proof_links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "tr":
            self.domain = attrs.get("data-domain")
        if tag == "a" and self.domain and "cap-verified" in attrs.get("class", "").split():
            self.proof_links.append((self.domain, attrs.get("href", "")))
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

    def handle_endtag(self, tag):
        if tag == "tr":
            self.domain = None


dist = Path(__file__).resolve().parents[1] / "dist"
origin = "https://hypergolic.sh/"
hostname = urlsplit(origin).hostname
if (dist / "CNAME").read_text().strip() != hostname:
    raise SystemExit(f"dist/CNAME must contain {hostname}")

references = []
home_links = ("/capabilities/", "/explorer/", "/insights/")
evidence_route = "/capabilities/v0.2.0/tests/"
edition_routes = tuple(
    f"/insights/{edition.stem}/"
    for edition in sorted((dist.parent / "data" / "insights").glob("????-??-??.json"))
)
routes = ("/", *home_links, evidence_route, *edition_routes)
page_ids = {}
for route in routes:
    page = Page()
    path = dist / route.strip("/") / "index.html"
    page.feed(path.read_text())
    page_ids[path] = page.ids
    page_url = urljoin(origin, route)
    if page.canonical != page_url:
        raise SystemExit(f"Expected the canonical URL for {route} to be {page_url}")
    if route == "/" and not all(path in page.urls for path in home_links):
        raise SystemExit("The homepage must link to capabilities, Explorer and Insights")
    for domain, href in page.proof_links:
        if urljoin(page_url, href) != urljoin(origin, f"{evidence_route}#{domain}"):
            raise SystemExit(f"The {domain} verification badge must link to its release test section")
    references.extend((page_url, ref) for ref in page.urls)

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
    if target.fragment and path in page_ids and unquote(target.fragment) not in page_ids[path]:
        raise SystemExit(f"Missing fragment for {ref} referenced by {source}")

print("Pages routes, canonical URLs, custom domain and linked site assets verified.")
