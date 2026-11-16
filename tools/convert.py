#!/usr/bin/env python3
"""combined.dnd40.merged.xml -> 종류별 JSON 묶음.
사용: python3 -I tools/convert.py <merged.xml> <출력 폴더>
요소 꼴: {id,n,t,src,cat[],pre,pp,fl,sp{},r[[문장,{속성}]],body}
속성 이름은 소문자로 통일(Field/field, Requires/requires 등이 섞여 있음)."""
import sys, os, json, re, collections
import xml.etree.ElementTree as ET

GROUPS = {
    "core": None,  # 아래 목록에 없는 종류 전부 (레벨, 능력치, 기술, 숙련, 분류 등 엔진 뼈대)
    "power": ["Power"], "item": ["Magic Item", "Item Set", "Item Set Benefit"],
    "feature": ["Class Feature", "Racial Trait"], "feat": ["Feat"],
    "companion": ["Companion", "Familiar", "Associate"],
    "background": ["Background", "Background Choice", "Background Association", "Theme"],
    "path": ["Paragon Path", "Epic Destiny"], "ritual": ["Ritual", "Ritual Scroll"],
    "gear": ["Weapon", "Armor", "Gear", "Superior Implement"],
}
T2G = {t: g for g, ts in GROUPS.items() if ts for t in ts}
ws = lambda s: re.sub(r"[ \t]+\n", "\n", (s or "").strip())

def spkey(sp, k):
    """같은 이름의 칸이 두 번 나오면(1차 Hit 과 2차 Hit 등) 뒤엣것이 앞엣것을 덮지 않게 이름을 바꾼다."""
    if k not in sp: return k
    pre = "Tertiary " if ("Tertiary Attack" in sp or "Tertiary Target" in sp) else "Secondary " if ("Secondary Attack" in sp or "Secondary Target" in sp or "Secondary Targets" in sp) else ""
    if pre and not k.startswith(pre) and (pre + k) not in sp: return pre + k
    n = 2
    while "%s (%d)" % (k, n) in sp: n += 1
    return "%s (%d)" % (k, n)

def conv(el):
    o = {"id": el.get("internal-id"), "n": el.get("name"), "t": el.get("type")}
    if el.get("source"): o["src"] = [s.strip() for s in el.get("source").split(",") if s.strip()]
    sp, rules, cats = {}, [], []
    body = [el.text or ""]
    for c in el:
        tag = c.tag.lower()
        if tag == "specific":
            v = ws(c.text)
            if v: sp[spkey(sp, (c.get("name") or "").strip())] = v
        elif tag == "rules":
            for r in c:
                rules.append([r.tag.lower(), {k.lower(): v for k, v in r.attrib.items()}])
        elif tag == "category":
            cats += [x.strip() for x in (c.text or "").split(",") if x.strip()]
        elif tag == "prereqs":
            if ws(c.text): o["pre"] = ws(c.text)
        elif tag == "print-prereqs":
            if ws(c.text): o["pp"] = ws(c.text)
        elif tag == "flavor":
            if ws(c.text): o["fl"] = ws(c.text)
        body.append(c.tail or "")
    if cats: o["cat"] = cats
    if sp: o["sp"] = sp
    if rules: o["r"] = rules
    b = ws("".join(body))
    if b: o["body"] = b
    return o

def main(src, out):
    os.makedirs(out, exist_ok=True)
    groups = collections.defaultdict(list); types = collections.Counter()
    for ev, el in ET.iterparse(src):
        if el.tag == "RulesElement":
            o = conv(el); types[o["t"]] += 1
            groups[T2G.get(o["t"], "core")].append(o); el.clear()
    index = {"groups": {}, "types": dict(types), "total": sum(types.values())}
    for g, arr in groups.items():
        p = os.path.join(out, g + ".json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(arr, f, ensure_ascii=False, separators=(",", ":"))
        index["groups"][g] = {"count": len(arr), "bytes": os.path.getsize(p)}
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print(json.dumps(index["groups"], indent=1), "total", index["total"])

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
