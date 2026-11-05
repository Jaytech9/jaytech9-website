"""One-off: recover Astro source from the Oct 2026 built preview."""
import re, os, glob, posixpath, json, sys
SRC = sys.argv[1]; OUT = 'src'
CID_ATTR = re.compile(r'\s+data-astro-cid-[a-z0-9]+(="true")?')
CID_CSS = re.compile(r'\[data-astro-cid-[a-z0-9]+\]')

def url_of(rel):  # 'work/x/index.html' -> '/work/x/'
    if rel == '404.html': return '/404/'
    d = posixpath.dirname(rel)
    return '/' + (d + '/' if d else '')

def fix_links(html, rel):
    base = posixpath.dirname(rel)
    def sub(m):
        attr, v = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|#|/)', v): return m.group(0)
        p = posixpath.normpath(posixpath.join(base, v))
        if p.endswith('index.html'): p = p[:-10]
        p = '/' + p.lstrip('./') if p not in ('.', '') else '/'
        if p.startswith('/.'): p = '/'
        return f'{attr}="{p}"'
    return re.sub(r'(href|action|src)="([^"]*)"', sub, html)

pages = sorted(glob.glob('**/*.html', root_dir=SRC, recursive=True))
global_css = open(f'{SRC}/_astro/Base.DsLVSOgL.css').read()
for rel in pages:
    s = open(f'{SRC}/{rel}').read()
    title = re.search(r'<title>(.*?)</title>', s).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
    og = re.search(r'og:type" content="(\w+)"', s).group(1)
    noindex = 'noindex' in s
    style = re.search(r'<head>.*?<style>(.*?)</style>', s, re.S).group(1)
    style = CID_CSS.sub('', style).strip()
    main = re.search(r'<main id="main">(.*)</main>', s, re.S).group(1)
    main = fix_links(CID_ATTR.sub('', main), rel)
    out = 'index.astro' if rel == 'index.html' else ('404.astro' if rel == '404.html' else posixpath.dirname(rel) + '.astro')
    depth = out.count('/')
    imp = '../' * (depth + 1) + 'layouts/Base.astro'
    props = [f'title={json.dumps(title, ensure_ascii=False)}', f'description={json.dumps(desc, ensure_ascii=False)}']
    if og != 'website': props.append(f'ogType="{og}"')
    if noindex: props.append('noindex')
    body = f'---\nimport Base from "{imp}";\n---\n\n<Base {" ".join(props)}>\n{main}\n</Base>\n\n<style>\n{style}\n</style>\n'
    os.makedirs(posixpath.dirname(f'{OUT}/pages/{out}') or '.', exist_ok=True)
    open(f'{OUT}/pages/{out}', 'w').write(body)
    print(rel, '->', out, url_of(rel))
# split shared CSS
css = re.sub(r'@font-face\{[^}]*\}', '', global_css)
rules = re.findall(r'(@media[^{]*\{(?:[^{}]*\{[^}]*\})*\}|[^{}@]+\{[^}]*\})', css)
g, h, f = [], [], []
for r in rules:
    (h if 'nen7h5rs' in r else f if 'jo6i4kqk' in r else g).append(CID_CSS.sub('', r))
assert len("".join(rules)) == len(css.strip())
open(f'{OUT}/styles/global.css', 'w').write('\n'.join(g) + '\n')
open('tools/header.css', 'w').write('\n'.join(h) + '\n')
open('tools/footer.css', 'w').write('\n'.join(f) + '\n')
