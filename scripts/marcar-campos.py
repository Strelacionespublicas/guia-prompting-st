"""Marca en site/index.html los campos completables, las casillas y los prompts copiables.

- Celdas vacías de tablas y espacios con renglones  -> data-field (texto)
- Casillas dibujadas (☐ y cuadraditos)              -> <input type="checkbox" data-field>
- Columna "Estado" del checklist general           -> data-kind="estado" (lista desplegable)
- Recuadros "PROMPT ..."                            -> botón Copiar

Cada campo recibe un id estable (sección + tipo + número de orden) y una etiqueta
legible (data-label) que usa el panel de seguimiento. Correr una sola vez sobre el
HTML sin marcar: si ya tiene data-field, el script no hace nada.

Uso: python3 scripts/marcar-campos.py
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

PATH = Path(__file__).resolve().parent.parent / 'site' / 'index.html'
html = PATH.read_text(encoding='utf-8')
if 'data-field=' in html:
    sys.exit('index.html ya tiene campos marcados; no hago nada.')

soup = BeautifulSoup(html, 'html.parser')
counters = defaultdict(int)
CHECK_STYLE = 'flex:none;width:16px;height:16px;margin:4px 0 0'


def clean(text):
    return re.sub(r'\s+', ' ', text or '').strip()


def section_of(el):
    sec = el.find_parent('section')
    return sec if sec is not None and sec.get('id') else None


def section_title(sec):
    h2 = sec.find('h2')
    return clean(h2.get_text()) if h2 else sec['id']


def is_box_title(tag):
    """Títulos de recuadro en mayúsculas: EJERCICIO · ..., ACTIVIDAD · ..., ANTES DE AVANZAR."""
    if tag.name != 'div' or tag.find(['div', 'table', 'p']):
        return False
    t = clean(tag.get_text())
    return 3 < len(t) < 90 and t.upper() == t and any(c.isalpha() for c in t)


def context_of(el, sec):
    """El subtítulo o título de recuadro más cercano hacia arriba, dentro de la misma sección."""
    for prev in el.find_all_previous(['h3', 'h4', 'div']):
        if section_of(prev) is not sec:
            return ''
        if prev.name in ('h3', 'h4') or is_box_title(prev):
            return clean(prev.get_text())
    return ''


def new_id(sec, kind):
    key = (sec['id'], kind)
    counters[key] += 1
    return f"{sec['id']}-{kind}{counters[key]}"


def label(*parts):
    return ' › '.join(p for p in parts if p)


# ---- Celdas vacías de tablas ----
for td in soup.find_all('td'):
    if td.contents or 'border' not in td.get('style', ''):
        continue
    sec = section_of(td)
    if sec is None:
        continue
    tr = td.find_parent('tr')
    table = td.find_parent('table')
    cells = tr.find_all('td', recursive=False)
    col = cells.index(td)
    header = ''
    ths = table.find('thead').find_all('th') if table.find('thead') else []
    if col < len(ths):
        header = clean(ths[col].get_text())
    row_label = clean(next(cells[0].stripped_strings, '')) if col > 0 else ''
    if not row_label:
        rows = [r for r in table.find_all('tr') if r.find('td')]
        row_label = f'fila {rows.index(tr) + 1}'
    td['data-field'] = new_id(sec, 't')
    td['data-label'] = label(section_title(sec), context_of(table, sec), row_label, header)
    if header.lower() == 'estado':
        td['data-kind'] = 'estado'

# ---- Espacios con renglones (y la línea simple del capítulo 1) ----
for div in soup.find_all('div'):
    style = div.get('style', '')
    if div.contents or not ('repeating-linear-gradient' in style or style.startswith('height:32px;border-bottom')):
        continue
    sec = section_of(div)
    prev = div.find_previous_sibling()
    prompt = clean(prev.get_text()) if prev is not None and prev.name == 'div' and not is_box_title(prev) else ''
    div['data-field'] = new_id(sec, 'r')
    div['data-label'] = label(section_title(sec), context_of(div, sec), prompt)
    div['data-kind'] = 'lines'

# ---- Casillas dibujadas como cuadraditos ----
for span in soup.find_all('span', style=re.compile(r'width:14px;height:14px;border:1\.5px solid #2A6F88')):
    sec = section_of(span)
    box = soup.new_tag('input', attrs={'type': 'checkbox', 'class': 'chk'})
    if span['style'].startswith('flex:none'):
        # Ítem de "Antes de avanzar": toda la línea es clickeable
        row = span.parent
        text = clean(row.get_text())
        row.name = 'label'
        box['style'] = CHECK_STYLE
    else:
        # Primera columna de una tabla de pruebas
        tr = span.find_parent('tr')
        text = clean(tr.find_all('td')[1].get_text())
    box['data-field'] = new_id(sec, 'c')
    box['data-label'] = label(section_title(sec), context_of(span, sec), text)
    box['aria-label'] = text
    span.replace_with(box)

# ---- Casillas escritas como "☐ texto" dentro de celdas ----
for td in soup.find_all('td'):
    if '☐' not in td.get_text():
        continue
    sec = section_of(td)
    stage = clean(td.find_parent('tr').find('td').get_text())
    parts = [p for p in td.decode_contents().split('<br/>')]
    td.clear()
    for raw in parts:
        text = clean(BeautifulSoup(raw, 'html.parser').get_text()).lstrip('☐').strip()
        lab = soup.new_tag('label', attrs={'class': 'chk-line'})
        box = soup.new_tag('input', attrs={'type': 'checkbox', 'class': 'chk', 'style': CHECK_STYLE})
        box['data-field'] = new_id(sec, 'c')
        box['data-label'] = label(section_title(sec), stage, text)
        lab.append(box)
        lab.append(NavigableString(text))
        td.append(lab)

# ---- Recuadros de prompts: botón Copiar ----
prompts = 0
for head in soup.find_all('div'):
    t = clean(head.get_text())
    if head.find('div') or not t.startswith('PROMPT') or 'background:#012C3D' not in head.get('style', ''):
        continue
    body = head.find_next_sibling('div')
    body['data-prompt'] = ''
    head['class'] = 'prompt-head'
    title = soup.new_tag('span')
    title.string = t
    btn = soup.new_tag('button', attrs={'type': 'button', 'class': 'copy-btn', 'data-action': 'copy',
                                        'data-noprint': '', 'aria-label': 'Copiar prompt: ' + t.split('·')[-1].strip().capitalize()})
    btn.string = 'Copiar'
    head.clear()
    head.append(title)
    head.append(btn)
    prompts += 1

PATH.write_text(str(soup), encoding='utf-8')
total = defaultdict(int)
for (_, kind), n in counters.items():
    total[kind] += n
print(f"Campos de texto: {total['t'] + total['r']} · casillas: {total['c']} · prompts: {prompts}")
