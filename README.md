# 4판 캐릭터 제작기

개인 RPG 팀용 D&D 4판 캐릭터 제작기. 망켓몬 도구들과는 별개. 빌드 없는 정적 사이트.

## 쓰는 법
1. 사이트를 열고 「데이터」 탭에서 Character Builder 폴더의 `Cache/combined.dnd40.merged.xml` 을 한 번 고른다. 이 브라우저에 보관된다.
2. 「내 캐릭터」에서 능력치를 적고 칸을 고른다. 오른쪽 시트가 바로 계산된다. 수치를 누르면 계산 내역이 나온다.
3. 「팀에 올리기」를 누르면 「팀 시트」 탭에서 GM 과 팀원이 같이 본다.

룰 데이터는 이 저장소에 넣지 않는다. 팀 시트 문서에는 고른 것의 이름 · id 와 계산된 수치만 들어간다.

## 파일
- `js/engine.js` — 룰 엔진 (grant · select · statadd · statalias · textstring)
- `js/data.js` — XML 불러오기 · 브라우저 보관(IndexedDB)
- `js/share.js` · `js/config.js` — 팀 시트 (Supabase docs 표, kind `dnd4e_char`)
- `js/app.js` · `css/app.css` · `index.html` — 화면
- `tools/convert.py` — XML 을 JSON 묶음으로 바꾸는 변환기 (엔진 시험용)
- `test/fighter.js` — 1레벨 인간 파이터 수치 대조: `node test/fighter.js <데이터 폴더>`

## 아직 없는 것
modify · replace(재훈련) · 장비 착용 · 조건부 보너스 반영 · 선행 조건 자동 확인.
