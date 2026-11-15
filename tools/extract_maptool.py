#!/usr/bin/env python3
"""맵툴 캠페인(.cmpgn 을 푼 content.xml)에서 토큰 내보내기에 쓸 본을 뽑아 js/mt_tpl.js 로 만든다.
사용: python3 -I tools/extract_maptool.py <content.xml> <js/mt_tpl.js> [맵툴 버전]
뽑는 것: 「PC 기본」 토큰(본), 매크로 항목 꼴, 파워 매크로 틀 둘(Lib:Initiative 의 set_ability · set_nonatk_ability 가 만드는 본문), 기술 매크로 틀."""
import sys, re, json, html
src, out = sys.argv[1], sys.argv[2]; ver = sys.argv[3] if len(sys.argv) > 3 else '1.18.8'
t = open(src, encoding='utf-8').read()
def token_xml(name):
    i = t.find('<name>%s</name>' % name); s = t.rfind('<net.rptools.maptool.model.Token>', 0, i)
    e = t.find('</net.rptools.maptool.model.Token>', i) + len('</net.rptools.maptool.model.Token>'); return t[s:e]
def macro_cmd(tok, label):
    k = tok.find('<label>%s</label>' % label); s = tok.rfind('<command>', 0, k); e = tok.find('</command>', s); return html.unescape(tok[s + 9:e])
base = token_xml('PC 기본')
base = re.sub(r'\n\s+', '\n', base)
base = base.replace('<id reference="../../net.rptools.maptool.model.GUID"/>', '<id>\n<baGUID>@@ID@@</baGUID>\n</id>')
base = re.sub(r'(<exposedAreaGUID>\s*<baGUID>)[^<]+', r'\1@@EXP@@', base, count=1)
img = re.search(r'<imageAssetMap>\s*<entry>\s*<null/>\s*<net\.rptools\.lib\.MD5Key>\s*<id>([0-9a-f]+)', base).group(1)
base = re.sub(r'(<imageAssetMap>\s*<entry>\s*<null/>\s*<net\.rptools\.lib\.MD5Key>\s*<id>)[0-9a-f]+', r'\1@@IMG@@', base, count=1)
size = re.search(r'<string>net\.rptools\.maptool\.model\.SquareGrid</string>\s*<net\.rptools\.maptool\.model\.GUID>\s*<baGUID>([^<]+)</baGUID>', t).group(1)
base = re.sub(r'<net\.rptools\.maptool\.model\.GUID reference="[^"]+"/>', '<net.rptools.maptool.model.GUID>\n<baGUID>%s</baGUID>\n</net.rptools.maptool.model.GUID>' % size, base)
assert 'reference=' not in base, '바깥 참조가 남아 있음'
base = base.replace('<name>PC 기본</name>', '<name>@@NAME@@</name>', 1)
base = re.sub(r'<propertyMapCI>.*?</propertyMapCI>', '@@PROPS@@', base, count=1, flags=re.S)
first = re.search(r'<entry>\s*<int>\d+</int>\s*<net\.rptools\.maptool\.model\.MacroButtonProperties>.*?</entry>', base, re.S).group(0)
idx = [int(x) for x in re.findall(r'<entry>\s*<int>(\d+)</int>', base)]
base = base.replace('</macroPropertiesMap>', '@@MACROS@@</macroPropertiesMap>', 1)
ent = first
for tag, key in [('int', 'INDEX'), ('index', 'INDEX'), ('macroUUID', 'UUID'), ('colorKey', 'COLOR'), ('command', 'COMMAND'), ('label', 'LABEL'), ('group', 'GROUP'), ('sortby', 'SORT'), ('fontColorKey', 'FONT'), ('toolTip', 'TIP')]:
    ent = re.sub(r'<%s>.*?</%s>' % (tag, tag), '<%s>@@%s@@</%s>' % (tag, key, tag), ent, count=1, flags=re.S)
lib = token_xml('Lib:Initiative')
def tpl(label):
    s = macro_cmd(lib, label); i = s.find('createMacro(power_name, "') + len('createMacro(power_name, "'); j = s.rfind('", macro_properties)'); return s[i:j]
# 기술 매크로: 실제 PC 의 것 하나를 본으로
m = re.search(r'<label>곡예 \([+-]?\d+\)</label>', t); k = m.start(); s0 = t.rfind('<command>', 0, k); skill = html.unescape(t[s0 + 9:t.find('</command>', s0)])
data = {'version': ver, 'img': img, 'token': base, 'entry': ent, 'nextIndex': max(idx) + 1, 'attack': tpl('set_ability'), 'nonatk': tpl('set_nonatk_ability'), 'skill': skill}
open(out, 'w', encoding='utf-8').write('/* 맵툴 캠페인에서 뽑은 본 (tools/extract_maptool.py 가 만듦). 캠페인이 바뀌면 다시 뽑는다. */\nwindow.D4E_MT = ' + json.dumps(data, ensure_ascii=False) + ';\n')
print('token', len(base), 'entry', len(ent), 'attack', len(data['attack']), 'nonatk', len(data['nonatk']), 'skill', len(skill), 'next index', data['nextIndex'])
