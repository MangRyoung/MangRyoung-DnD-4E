#!/usr/bin/env python3
"""맵툴 캠페인(.cmpgn 을 푼 content.xml)에서 몬스터 토큰 내보내기에 쓸 본을 뽑아 js/mon_tpl.js 로 만든다.
사용: python3 -I tools/extract_montoken.py <content.xml> <js/mon_tpl.js> [맵툴 버전]
뽑는 것: 「몹 기본」 토큰(본), 매크로 항목 꼴, Lib:Initiative 의 Create_creature_ability(공격 버튼) · Create_Create_Creature(수정 버튼) · set_creature_ability_natk(비공격 버튼)이 만드는 본문."""
import sys, re, json, html
src, out = sys.argv[1], sys.argv[2]; ver = sys.argv[3] if len(sys.argv) > 3 else '1.18.8'
t = open(src, encoding='utf-8').read()
def token_xml(name):
    i = t.find('<name>%s</name>' % name); s = t.rfind('<net.rptools.maptool.model.Token>', 0, i)
    e = t.find('</net.rptools.maptool.model.Token>', i) + len('</net.rptools.maptool.model.Token>'); return t[s:e]
def cmd_of(label):
    i = t.find('<label>%s</label>' % label); k = t.rfind('<command>', 0, i); return html.unescape(t[k + 9:t.find('</command>', k)])
base = re.sub(r'\n\s+', '\n', token_xml('몹 기본'))
base = base.replace('<id reference="../../net.rptools.maptool.model.GUID"/>', '<id>\n<baGUID>@@ID@@</baGUID>\n</id>')
base = re.sub(r'(<exposedAreaGUID>\s*<baGUID>)[^<]+', r'\1@@EXP@@', base, count=1)
base = re.sub(r'(<imageAssetMap>\s*<entry>\s*<null/>\s*<net\.rptools\.lib\.MD5Key>\s*<id>)[0-9a-f]+', r'\1@@IMG@@', base, count=1)
base = re.sub(r'<net\.rptools\.lib\.MD5Key reference="[^"]+"/>', '<net.rptools.lib.MD5Key>\n<id>@@IMG@@</id>\n</net.rptools.lib.MD5Key>', base, count=1)
assert '@@IMG@@' in base
size = re.search(r'<string>net\.rptools\.maptool\.model\.SquareGrid</string>\s*<net\.rptools\.maptool\.model\.GUID>\s*<baGUID>([^<]+)</baGUID>', t).group(1)
base = re.sub(r'<net\.rptools\.maptool\.model\.GUID reference="[^"]+"/>', '<net.rptools.maptool.model.GUID>\n<baGUID>%s</baGUID>\n</net.rptools.maptool.model.GUID>' % size, base)
assert 'reference=' not in base, '바깥 참조가 남아 있음'
base = base.replace('<name>몹 기본</name>', '<name>@@NAME@@</name>', 1)
if re.search(r'<propertyMapCI>.*?</propertyMapCI>', base, re.S): base = re.sub(r'<propertyMapCI>.*?</propertyMapCI>', '@@PROPS@@', base, count=1, flags=re.S)
else: base = base.replace('<propertyMapCI/>', '@@PROPS@@', 1)
assert '@@PROPS@@' in base
first = re.search(r'<entry>\s*<int>\d+</int>\s*<net\.rptools\.maptool\.model\.MacroButtonProperties>.*?</entry>', base, re.S).group(0)
idx = [int(x) for x in re.findall(r'<entry>\s*<int>(\d+)</int>', base)]
base = base.replace('</macroPropertiesMap>', '@@MACROS@@</macroPropertiesMap>', 1)
ent = first
for tag, key in [('int', 'INDEX'), ('index', 'INDEX'), ('macroUUID', 'UUID'), ('colorKey', 'COLOR'), ('command', 'COMMAND'), ('label', 'LABEL'), ('group', 'GROUP'), ('sortby', 'SORT'), ('fontColorKey', 'FONT'), ('toolTip', 'TIP')]:
    if re.search(r'<%s>.*?</%s>' % (tag, tag), ent, re.S): ent = re.sub(r'<%s>.*?</%s>' % (tag, tag), '<%s>@@%s@@</%s>' % (tag, key, tag), ent, count=1, flags=re.S)
    else: ent = ent.replace('<%s/>' % tag, '<%s>@@%s@@</%s>' % (tag, key, tag), 1)
for k in ('INDEX', 'UUID', 'COLOR', 'COMMAND', 'LABEL', 'GROUP', 'SORT', 'FONT', 'TIP'): assert '@@%s@@' % k in ent, k
ent = re.sub(r'<applyToTokens>[^<]*</applyToTokens>', '<applyToTokens>false</applyToTokens>', ent)
def tpl(label):
    s = cmd_of(label); i = s.find('createMacro(AA_name, "') + len('createMacro(AA_name, "'); j = s.rfind('", macro_properties)'); return s[i:j]
data = {'version': ver, 'token': base, 'entry': ent, 'nextIndex': max(idx) + 1, 'attack': tpl('Create_creature_ability'), 'edit': tpl('Create_Create_Creature'), 'natk': tpl('set_creature_ability_natk'),
        'labels': re.findall(r'<label>([^<]*)</label>', base)}
open(out, 'w', encoding='utf-8').write('/* 맵툴 캠페인에서 뽑은 몬스터 토큰 본 (tools/extract_montoken.py 가 만듦). 캠페인이 바뀌면 다시 뽑는다. */\nwindow.D4E_MONT = ' + json.dumps(data, ensure_ascii=False) + ';\n')
print('token', len(base), 'entry', len(ent), 'attack', len(data['attack']), 'edit', len(data['edit']), 'natk', len(data['natk']), 'next index', data['nextIndex'], data['labels'])
