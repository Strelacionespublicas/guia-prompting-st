"""Marca en site/index.html los bloques de texto que la docente puede editar desde la web.

Cada bloque recibe data-edit con un id estable (sección + número de orden). Las
ediciones se guardan en Firestore por ese id, así que no hay que volver a correr este
script salvo que se agregue contenido nuevo a la guía. Si ya hay bloques marcados,
conserva los existentes y solo numera los nuevos.

Uso: python3 scripts/marcar-editables.py
"""
import re
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

PATH = Path(__file__).resolve().parent.parent / 'site' / 'index.html'
TEXT_TAGS = {'h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th', 'div', 'dt', 'dd'}
INLINE = {'a', 'strong', 'b', 'em', 'i', 'u', 'span', 'br', 'code', 'sup', 'sub', 'small', 'mark'}

soup = BeautifulSoup(PATH.read_text(encoding='utf-8'), 'html.parser')
used = defaultdict(set)
for el in soup.select('[data-edit]'):
    sec, n = el['data-edit'].rsplit('-e', 1)
    used[sec].add(int(n))


def editable(el):
    if el.name not in TEXT_TAGS or el.has_attr('data-edit') or el.has_attr('data-field'):
        return False
    if el.find(['input', 'button', 'select', 'textarea']) or el.find(attrs={'data-field': True}):
        return False
    if el.find_parent(attrs={'data-noprint': True}) or el.has_attr('data-noprint'):
        return False
    if any(child.name and child.name not in INLINE for child in el.children):
        return False
    return bool(re.sub(r'\s+', '', el.get_text()))


added = 0
for sec in soup.select('section[id]'):
    sid = sec['id']
    n = max(used[sid], default=0)
    for el in sec.find_all(True):
        if editable(el):
            n += 1
            el['data-edit'] = f'{sid}-e{n}'
            added += 1

PATH.write_text(str(soup), encoding='utf-8')
print(f'Bloques editables nuevos: {added} · total: {len(soup.select("[data-edit]"))}')
