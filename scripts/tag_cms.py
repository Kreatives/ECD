#!/usr/bin/env python3
"""
Tag de statische HTML met CMS-attributen zodat /admin en js/cms-loader.js de media
kunnen beheren. Puur gerichte string-insertie: alleen attributen toevoegen + de
main.js-include vervangen. De rest van de HTML blijft byte-voor-byte identiek.

Idempotent: elementen die al 'data-cms' bevatten worden overgeslagen.

Draai vanuit de projectroot:  python3 scripts/tag_cms.py
"""
import re
import sys
import os

PAGES = [
    "index.html", "over-ons.html", "contact.html", "gallerij.html", "zalen.html",
    "zaal.html", "zaal-scheffers.html", "zaal-3.html",
    "bruiloft-marokkaans.html", "bruiloft-turks.html", "bruiloft-henna.html",
    "bruiloft-surinaams.html", "bruiloft-afghaans.html", "offerte.html", "bedankt.html",
]

CHROME = (
    "assets/icons/", "assets/logo/", "assets/img/paper-texture",
    "assets/img/paper-overlay", "assets/img/torn-paper", "assets/img/hero-poster",
)

ITEM_LINE_RE = re.compile(r'(marquee__item|carousel__item|gallery__item|class="reel")')
SRC_RE = re.compile(r'src="([^"]+)"')

GALLERY_LABELS = {
    "marquee": "Fotostrip",
    "reels": "Video's (reels)",
    "carousel": "Fotogalerij (carousel)",
    "grid": "Fotogalerij",
}

# container-detectie -> (kind, regex die de openingstag matcht).
# LET OP: geen afsluitende '>' zodat detectie ook klopt nadat de container al
# cms-attributen heeft gekregen (idempotent bij een re-run).
CONTAINERS = [
    ("reels",    re.compile(r'<div class="reels__track" data-reels-marquee\b')),
    ("marquee",  re.compile(r'<div class="marquee__track" data-marquee\b')),
    ("carousel", re.compile(r'<div class="carousel__track" data-carousel-track\b')),
    ("grid",     re.compile(r'<div class="gallery( gallery--grid)?" data-reveal\b')),
]

SCRIPT_OLD = '<script src="js/main.js"></script>'
SCRIPT_NEW = '<script src="/js/cms-loader.js" data-main="/js/main.js"></script>'


def pagekey(fn):
    return re.sub(r"\.html$", "", fn)


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "media"


def key_from_src(src):
    p = re.sub(r"^assets/", "", src)
    p = re.sub(r"\.[a-z0-9]+$", "", p, flags=re.I)
    parts = [x for x in p.split("/") if x]
    if parts and parts[0] in ("img", "video"):
        parts = parts[1:]
    base = "-".join(parts[-2:]) if len(parts) >= 2 else "-".join(parts)
    return slug(base)


def humanize(key):
    return key.replace("-", " ").strip().capitalize()


def esc(v):
    return v.replace("&", "&amp;").replace('"', "&quot;")


def unique_period(srcs):
    for k in range(1, len(srcs)):
        if srcs[k] == srcs[0]:
            return k
    return len(srcs)


def is_container(line):
    for kind, rx in CONTAINERS:
        if rx.search(line):
            return kind
    return None


def tag_file(path):
    with open(path, "r", encoding="utf-8") as fh:
        lines = fh.readlines()

    claimed = set()        # regelindexen die bij een galerij horen (niet als single taggen)
    seen_single = {}       # key -> count (uniciteit per pagina)
    seen_gallery = {}      # kind -> count
    pk = pagekey(os.path.basename(path))
    n_single = 0
    n_gallery = 0

    # ---- pass 1: galerij-containers taggen + hun items claimen ----
    i = 0
    while i < len(lines):
        kind = is_container(lines[i])
        if kind:
            # verzamel + claim aaneengesloten item-regels direct na de container
            # (altijd claimen, ook als de container al getagd is -> re-run is veilig)
            srcs = []
            j = i + 1
            while j < len(lines) and ITEM_LINE_RE.search(lines[j]) and "assets/" in lines[j]:
                m = SRC_RE.search(lines[j])
                if m:
                    srcs.append(m.group(1))
                claimed.add(j)
                j += 1

            if "data-cms-gallery" not in lines[i]:
                count = unique_period(srcs) if srcs else 0
                seen_gallery[kind] = seen_gallery.get(kind, 0) + 1
                gkey = kind if seen_gallery[kind] == 1 else f"{kind}-{seen_gallery[kind]}"
                media = "video" if kind == "reels" else "image"
                label = GALLERY_LABELS.get(kind, "Galerij")
                attrs = (
                    f' data-cms-gallery="{pk}:{gkey}" data-cms-kind="{kind}"'
                    f' data-cms-media="{media}" data-cms-count="{count}"'
                    f' data-cms-label="{esc(label)}"'
                )
                lines[i] = re.sub(r"(<div\b[^>]*?)>", r"\1" + attrs + ">", lines[i], count=1)
                n_gallery += 1
            i = j
            continue
        i += 1

    # ---- pass 2: single media taggen ----
    for idx, line in enumerate(lines):
        if idx in claimed:
            continue
        if "data-cms" in line:
            continue
        if "data-zaaltabs-img" in line:   # door tabs aangestuurd -> overslaan
            continue

        # Hero video: src staat op <source>, poster op <video> -> apart behandelen.
        if "<video" in line and 'class="hero__video"' in line:
            attrs = f'data-cms="{pk}:hero-video" data-cms-label="Hero video"'
            lines[idx] = re.sub(r"<video\b", f"<video {attrs}", line, count=1)
            n_single += 1
            continue

        m = SRC_RE.search(line)
        if not m:
            continue
        src = m.group(1)
        if not src.startswith("assets/"):
            continue
        if any(src.startswith(c) or c in src for c in CHROME):
            continue
        if "<img" not in line:
            continue

        base = key_from_src(src)
        seen_single[base] = seen_single.get(base, 0) + 1
        key = base if seen_single[base] == 1 else f"{base}-{seen_single[base]}"
        label = humanize(key)

        attrs = f'data-cms="{pk}:{key}" data-cms-label="{esc(label)}"'
        lines[idx] = re.sub(r"<img\b", f"<img {attrs}", line, count=1)
        n_single += 1

    # ---- pass 3: main.js include vervangen door de cms-loader ----
    swapped = 0
    for idx, line in enumerate(lines):
        if SCRIPT_OLD in line:
            lines[idx] = line.replace(SCRIPT_OLD, SCRIPT_NEW)
            swapped += 1

    with open(path, "w", encoding="utf-8") as fh:
        fh.writelines(lines)

    return n_single, n_gallery, swapped


def main():
    root = os.getcwd()
    total_s = total_g = 0
    for fn in PAGES:
        path = os.path.join(root, fn)
        if not os.path.exists(path):
            print(f"  (overslaan, bestaat niet) {fn}")
            continue
        s, g, sw = tag_file(path)
        total_s += s
        total_g += g
        print(f"{fn:28s}  singles:{s:3d}  galerijen:{g:2d}  script-swap:{sw}")
    print(f"\nTotaal: {total_s} single-media, {total_g} galerijen getagd.")


if __name__ == "__main__":
    main()
