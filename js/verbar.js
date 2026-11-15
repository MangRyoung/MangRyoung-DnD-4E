/* 새 버전 알림: version.json 의 값이 이 화면이 열릴 때의 값과 달라지면 위에 띠를 띄운다.
 * 올릴 때마다 tools/bump.sh 로 index.html 과 version.json 의 값을 같이 바꾼다. */
(function () {
  'use strict';
  var m = document.querySelector('meta[name="d4e-version"]'), mine = m ? m.content : '', shown = false;
  async function check() {
    if (shown || !mine) return;
    try {
      var r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      var v = (await r.json()).v;
      if (v && v !== mine) {
        shown = true;
        var bar = document.createElement('div'); bar.className = 'verbar';
        bar.innerHTML = '<span>새 버전이 올라왔어요. 새로 고침하면 반영돼요. 만들던 캐릭터는 그대로 남아요.</span>';
        var b = document.createElement('button'); b.textContent = '새로 고침'; b.onclick = function () { location.reload(); };
        bar.appendChild(b); document.body.insertBefore(bar, document.body.firstChild);
      }
    } catch (e) {}
  }
  setInterval(check, 180000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  setTimeout(check, 20000);
})();
