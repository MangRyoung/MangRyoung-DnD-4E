/* 시트 공유용 DB. 망켓몬 도구들과 같은 Supabase 프로젝트의 docs 표를 쓰되 kind 를 따로 둔다.
   공개해도 되는 키다(권한은 DB 정책이 정한다). 비우면 이 브라우저에만 저장된다. */
window.D4E_CONFIG = {
  supabaseUrl: "https://jsnvqcvwspxzfnhdethl.supabase.co",
  supabaseKey: "sb_publishable_HDcgWnb1QS1P6GOiBPqdAA_yBJNhU7R",
  table: "docs",
  kind: "dnd4e_char",
  /* 하우스룰 · 자작 요소: 문서 하나 = 요소 하나 */
  houseKind: "dnd4e_house"
};
