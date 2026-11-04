import { store } from './store.js';
import { HOST_PIN, WIFI, COURSE_TITLE } from './config.js';
import {
  PHASES, TYPES, STRATEGIES, R1_CARDS, R2_GROUPS, R2_PIECES, R2_REFINE, R2_MISSING,
  R3_CARDS, QUADS, QUAD_LAYOUT, FINAL, scoreR1, scoreR2,
} from './content.js';

const $ = document.getElementById('host');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

const H = {
  authed: false, session: null, players: [], fake: [], useFake: false,
  tab: 'live', scene: { r1: 0, r2: 0, r3: 0 }, r1card: 0, r1open: false, r3card: 0, r3open: false, flipped: new Set(), resetArm: false, unsub: null,
};
try { H.authed = sessionStorage.getItem('kimdaeri_host') === '1'; } catch {}

const playerURL = () => location.origin + location.pathname.replace(/host(\.html)?$/, '');
const all = () => H.useFake ? [...H.players, ...H.fake] : H.players;

// ---------------- 가상 데이터 ----------------
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function pickW(r, items) { const tot = items.reduce((a, [, w]) => a + w, 0); let x = r() * tot; for (const [v, w] of items) { if ((x -= w) <= 0) return v; } return items[items.length - 1][0]; }
function makeFake(n = 70) {
  const r = rng(20261105);
  const out = [];
  for (let k = 0; k < n; k++) {
    const answers = {};
    for (const c of R1_CARDS) {
      let type;
      if (c.id === 'c3') type = pickW(r, [['support', 58], ['core', 37], ['project', 3], ['future', 2]]);
      else if (c.id === 'c6') type = pickW(r, [['project', 50], ['core', 45], ['future', 5]]);
      else type = r() < 0.8 ? c.type[0] : TYPES[Math.floor(r() * 4)].id;
      const fut = c.type[0] === 'future';
      const strat = pickW(r, [[c.strat, 52], ['gap', fut ? 12 : 22], ['spare', fut ? 30 : 10], ['focus', 5], ['batch', 5], ['split', 5], ['fixed', 4]]);
      answers[c.id] = { type, strat };
    }
    const place = {};
    for (const p of R2_PIECES) {
      if (p.trap) place[p.id] = r() < 0.45 ? 'big' : ['plan', 'dev', 'launch'][Math.floor(r() * 3)];
      else place[p.id] = r() < 0.8 ? p.ans[0] : R2_GROUPS[Math.floor(r() * 4)].id;
    }
    const refine = {};
    for (const q of R2_REFINE) { const c = q.options.find(o => o.correct).id; refine[q.id] = r() < 0.55 ? c : q.options[Math.floor(r() * 4)].id; }
    const mp = { m1: 0.45, m2: 0.35, m3: 0.3, m4: 0.1, m5: 0.25 };
    const missing = Object.keys(mp).filter(id => r() < mp[id]);
    if (!missing.length) missing.push('m1');
    // R3
    const quad = {};
    for (const c of R3_CARDS) {
      if (c.id === 't8') quad[c.id] = pickW(r, [[1, 40], [3, 30], [2, 25], [4, 5]]);
      else if (c.id === 't3') quad[c.id] = pickW(r, [[1, 55], [3, 35], [2, 8], [4, 2]]);
      else if (c.id === 't7') quad[c.id] = pickW(r, [[2, 55], [4, 35], [1, 5], [3, 5]]);
      else quad[c.id] = r() < 0.7 ? c.q : 1 + Math.floor(r() * 4);
    }
    out.push({ id: 'fake' + k, fake: true, nick: '가상' + (k + 1), r1: { answers, done: true }, r2: { place, refine, missing, done: true }, r3: { quad, done: true } });
  }
  return out;
}

// ---------------- 공통 조각 ----------------
function bar(label, n, tot, cls = '') {
  return `<div class="bar ${cls}"><div>${label}</div><div class="tr"><i style="width:${pct(n, tot)}%"></i></div><div class="v">${pct(n, tot)}%</div></div>`;
}
function sceneNav(key, names) {
  return `<div class="scene-nav">${names.map((n, i) => `<button class="${H.scene[key] === i ? 'cur' : ''}" data-act="scene" data-k="${key}" data-v="${i}">${i + 1}. ${n}</button>`).join('')}
    <span style="flex:1"></span><button data-act="scene" data-k="${key}" data-v="${Math.max(0, H.scene[key] - 1)}">◀ 이전</button><button data-act="scene" data-k="${key}" data-v="${Math.min(names.length - 1, H.scene[key] + 1)}">다음 ▶</button></div>`;
}
const say = (t) => `<div class="say">💬 ${t}</div>`;
const nRespond = (k) => all().filter(p => p[k]).length;

// ---------------- 진행 현황 ----------------
function viewLive() {
  const ph = H.session?.phase || 'lobby';
  const ps = all();
  if (ph === 'lobby' || ph === 'end') {
    return `<div class="lobby"><div class="qr" id="qr"></div><div>
      <div class="s-sub" style="margin:0">휴대폰 카메라로 QR을 찍거나 주소를 입력하세요</div>
      <div class="url">${esc(playerURL().replace(/^https?:\/\//, ''))}</div>
      ${WIFI.name ? `<div class="wifi">📶 와이파이 <b>${esc(WIFI.name)}</b>${WIFI.password ? ` · 비밀번호 <b>${esc(WIFI.password)}</b>` : ''}</div>` : ''}
      <div class="s-title" style="margin-top:22px">입장 ${ps.filter(p => p.nick).length}명</div>
      <div class="nicks">${ps.filter(p => p.nick).slice(-120).map(p => `<span>${esc(p.nick)}</span>`).join('')}</div></div></div>`;
  }
  const n = ph[1];
  const key = 'r' + n;
  const joined = ps.filter(p => p.nick).length;
  const done = ps.filter(p => p[key]?.done).length;
  const started = ps.filter(p => p[key]).length;
  const titles = { 1: 'ROUND 1 · 나누기', 2: 'ROUND 2 · 쪼개기', 3: 'ROUND 3 · 순서 정하기' };
  return `<div class="s-title">${titles[n]}</div><div class="s-sub">${ph.endsWith('close') ? '마감됨 — 결과 탭에서 공개하세요' : '진행 중'}</div>
    <div class="big2"><div><b>${done} / ${joined}</b><span>제출 완료</span></div><div><b>${started}</b><span>참여 시작</span></div></div>
    <div class="bars">${bar('제출 완료', done, joined, 'ok')}</div>
    ${ph.endsWith('close') ? '' : say('대부분 제출하면 상단의 <b>마감</b> 버튼을 눌러 주세요. 마감 시점까지의 응답으로 결과를 보여줍니다.')}`;
}

// ---------------- ROUND 1 결과 ----------------
function viewR1() {
  const ps = all().filter(p => p.r1?.answers);
  const names = ['카드별 정답 공개', '업무 4유형 정의', '4가지 처리 전략'];
  const s = H.scene.r1;
  let body = '';
  if (s === 0) {
    const i = H.r1card, c = R1_CARDS[i], open = H.r1open;
    const a = ps.map(p => p.r1.answers[c.id]).filter(Boolean);
    const at = a.filter(x => x.type).length, as = a.filter(x => x.strat).length;
    const typeBars = TYPES.map(t => bar(t.label, a.filter(x => x.type === t.id).length, at, open && t.id === c.type[0] ? 'ok' : '')).join('');
    const stratBars = STRATEGIES.map(st => bar(st.short, a.filter(x => x.strat === st.id).length, as, open && st.id === c.strat ? 'ok' : '')).join('');
    const ansType = TYPES.find(t => t.id === c.type[0]).label;
    const ansStrat = STRATEGIES.find(t => t.id === c.strat).label;
    body = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        ${R1_CARDS.map((x, k) => `<button class="h-btn sm" style="${k === i ? 'background:var(--navy);color:#fff' : 'background:#eef1f5'}" data-act="r1card" data-v="${k}">${k + 1}</button>`).join('')}
        <span style="color:var(--muted);margin-left:8px">응답 ${at}명</span></div>
      <div class="s-title">카드 ${i + 1}. ${esc(c.title)}</div><div class="s-sub">${esc(c.text)}</div>
      <div class="grid-cards r1grid"><div class="mini"><h4>Q1. 어떤 유형인가요?</h4>${typeBars}</div><div class="mini"><h4>Q2. 어떻게 처리할까요?</h4>${stratBars}</div></div>
      ${open ? `<div class="answer"><div class="ans-h"><span>정답</span><b>${ansType}</b><i>→</i><b>${ansStrat}</b>${c.type.length > 1 ? `<small>(${TYPES.find(t => t.id === c.type[1]).label}도 인정)</small>` : ''}</div><p>${esc(c.reason)}</p></div>`
        : `<div style="text-align:center;margin-top:24px"><button class="btn" style="max-width:360px;margin:0 auto;font-size:22px" data-act="r1open">정답 공개</button></div>`}
      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <button class="h-btn" style="background:#eef1f5" data-act="r1card" data-v="${Math.max(0, i - 1)}" ${i === 0 ? 'disabled' : ''}>◀ 이전 카드</button>
        ${i < R1_CARDS.length - 1 ? `<button class="h-btn" style="background:var(--navy);color:#fff" data-act="r1card" data-v="${i + 1}">다음 카드 ▶</button>` : `<button class="h-btn" style="background:var(--navy);color:#fff" data-act="scene" data-k="r1" data-v="1">업무 4유형 정의 ▶</button>`}</div>`;
  } else if (s === 1) {
    body = `<div class="s-title">업무 4유형의 정의와 구분 순서</div><div class="s-sub">위에서부터 차례로 질문합니다</div>
      <table class="tbl"><tr><th>순서</th><th>구분하는 질문</th><th>예 →</th></tr>
      <tr><td>①</td><td>정해진 결과물을 완성하면 종료되는 업무인가?</td><td><b>프로젝트성 업무</b></td></tr>
      <tr><td>②</td><td>당장의 성과보다 미래를 위해 미리 투자하는 업무인가?</td><td><b>미래준비성 업무</b></td></tr>
      <tr><td>③</td><td>내 직무에서 반복적으로 책임지고 수행하는 주요 업무인가?</td><td><b>핵심업무</b></td></tr>
      <tr><td>④</td><td>주요 성과를 뒷받침하는 지원 업무인가?</td><td><b>보조업무</b></td></tr></table>
      ${say('"끝이 있는가?"를 먼저 묻습니다. 끝이 있는 일은 중요도와 상관없이 쪼개서 관리해야 하니까요.')}`;
  } else if (s === 2) {
    body = `<div class="s-title">4가지 업무처리 전략</div><div class="s-sub">유형에 따라 처리 방법이 다릅니다</div>
      <table class="tbl"><tr><th>유형</th><th>전략</th><th>한 줄 설명</th></tr>
      ${STRATEGIES.filter(s => !s.trap).map(s => `<tr><td>${TYPES.find(t => t.id === s.type).label}</td><td><b>${s.label}</b></td><td>${s.desc}</td></tr>`).join('')}</table>
      ${say('보조업무는 묶어서 처리합니다. 단, <b>2분 안에 끝나는 일</b>과 <b>고객 피해가 걸린 긴급 건</b>은 바로 처리하세요.')}
      <div class="say" style="font-size:28px;text-align:center;background:var(--navy);color:#fff;border:0">핵심은 가장 좋은 시간에 먼저, 보조는 정해진 시간에 묶어서, 프로젝트는 쪼개서, 미래는 조금씩 꾸준히.</div>`;
  }
  return sceneNav('r1', names) + body;
}

// ---------------- ROUND 2 결과 ----------------
function viewR2() {
  const ps = all().filter(p => p.r2);
  const names = ['더 쪼개야 할 작업', '빠진 작업 찾기', '정답 구조도', 'WBS 원칙'];
  const s = H.scene.r2;
  let body = '';
  if (!ps.length && s < 3) body = `<div class="s-sub">아직 응답이 없습니다.</div>`;
  else if (s === 0) {
    const traps = R2_PIECES.filter(p => p.trap);
    body = `<div class="s-title">'더 쪼개야 할 작업'을 알아챈 비율</div><div class="s-sub">STEP 1에서 이 카드를 '더 쪼개야 할 작업'에 넣은 비율</div>
      <div class="bars">${traps.map(p => { const a = ps.filter(x => x.r2.place?.[p.id]); return bar(esc(p.title), a.filter(x => x.r2.place[p.id] === 'big').length, a.length, 'trap'); }).join('')}</div>
      <div class="grid-cards" style="margin-top:20px">${R2_REFINE.map(q => {
        const a = ps.filter(x => x.r2.refine?.[q.id]);
        return `<div class="mini"><h4>STEP 2 · ${esc(q.big)}</h4>${q.options.map(o => bar(esc(o.text), a.filter(x => x.r2.refine[q.id] === o.id).length, a.length, o.correct ? 'ok' : '')).join('')}</div>`;
      }).join('')}</div>
      ${say("'앱 완성도 높이기'에 담당자와 마감일은 적을 수 있습니다. 그런데 <b>무엇이 끝나면 이 일을 끝냈다고 할 수 있을까요?</b>")}`;
  } else if (s === 1) {
    const a = ps.filter(x => x.r2.missing);
    body = `<div class="s-title">빠진 작업 찾기</div><div class="s-sub">각 보기를 고른 비율 (응답 ${a.length}명)</div>
      <div class="bars">${R2_MISSING.map(m => bar(esc(m.text), a.filter(x => x.r2.missing.includes(m.id)).length, a.length, m.correct ? 'ok' : '')).join('')}</div>
      <div class="s-sub" style="margin:22px 0 0">정답 카드를 눌러 이유를 공개하세요</div>
      <div class="flip">${R2_MISSING.filter(m => m.correct).map(m => `<div class="fcard ${H.flipped.has(m.id) ? 'open' : ''}" data-act="flip" data-v="${m.id}"><div class="in">
        <div class="fr">${esc(m.text)}<small>${pct(a.filter(x => x.r2.missing.includes(m.id)).length, a.length)}%가 찾음</small></div><div class="bk">${esc(m.tag)}</div></div></div>`).join('')}</div>
      ${H.flipped.size >= 3 ? say('프로젝트를 계획할 때는 눈앞의 작업에 집중하다 보니, <b>다른 부서가 해야 할 일이나 출시 후 점검, 중간 확인 작업</b>을 놓칠 수 있습니다. 우리 회사에서도 비슷한 경험이 있으셨나요?') : ''}`;
  } else if (s === 2) {
    const tree = `<div class="anstree"><div class="ar">앱 개선 프로젝트</div><div class="ac">${R2_GROUPS.filter(g => g.id !== 'big').map(g => `<div><b>${g.label}</b>${R2_PIECES.filter(p => p.ans[0] === g.id).map(p => `<span>${esc(p.title)}${p.dept ? ` <em>${esc(p.dept)}</em>` : ''}</span>`).join('')}</div>`).join('')}</div>
      <div class="abig"><b>✂️ 더 쪼개야 할 작업</b>${R2_PIECES.filter(p => p.ans[0] === 'big').map(p => `<span>${esc(p.title)}</span>`).join('')}</div></div>`;
    body = `<div class="s-title">정답 구조도</div><div class="s-sub">아래는 작업별로 교육생이 넣은 묶음 비율 (초록색 = 정답)</div>${tree}
      <div class="grid-cards" style="margin-top:20px">` +
      R2_PIECES.map(p => {
        const a = ps.filter(x => x.r2.place?.[p.id]);
        return `<div class="mini"><h4>${esc(p.title)}${p.dept ? ` <span class="dept">${esc(p.dept)}</span>` : ''}</h4>
          ${R2_GROUPS.map(g => bar(g.label, a.filter(x => x.r2.place[p.id] === g.id).length, a.length, p.ans.includes(g.id) ? 'ok' : '')).join('')}</div>`;
      }).join('') + `</div>`;
  } else if (s === 3) {
    body = `<div class="s-title">WBS (Work Breakdown Structure, 작업분할구조)</div>
      <div class="s-sub">프로젝트에 필요한 전체 작업 범위를 계층적으로 나누어 구조화하는 방법</div>
      <table class="tbl"><tr><th>오늘 바로 쓰는 실무 원칙</th><th>설명</th><th>체험한 장면</th></tr>
      <tr><td><b>묶음으로 나눈다</b></td><td>전체 작업을 성격이 같은 묶음으로 나눈다 (순서가 아니라 범위)</td><td>STEP 1</td></tr>
      <tr><td><b>완료를 확인할 수 있는 크기로</b></td><td>"무엇이 끝나면 끝인가?"에 답할 수 있을 때까지 구체화한다</td><td>STEP 2</td></tr>
      <tr><td><b>빠짐없이 담는다</b></td><td>다른 부서의 일, 끝난 다음의 일, 중간 확인 작업까지 포함한다</td><td>STEP 3</td></tr></table>
      ${say('WBS는 <b>무엇을</b> 할지, 일정관리는 <b>언제 어떤 순서로</b> 할지, 우선순위는 <b>무엇을 먼저</b> 할지 정하는 것입니다.')}
      <div class="say" style="font-size:28px;text-align:center;background:var(--navy);color:#fff;border:0">큰 업무는 나눈다. 빠진 업무는 찾는다.</div>`;
  }
  return sceneNav('r2', names) + body;
}

// ---------------- ROUND 3 결과 ----------------
function hostMatrix(cellFn, showAction) {
  const q = (n) => `<div class="quad ${QUADS[n].cls}"><h4>${QUADS[n].label}${showAction ? ` <span class="act">${QUADS[n].action}</span>` : ''}</h4>${cellFn(n)}</div>`;
  return `<div class="matrix2"><div class="ay">중요도 ▲</div><div class="mg">${QUAD_LAYOUT.map(q).join('')}</div><div></div><div class="ax2">긴급성 ▶</div></div>`;
}
function viewR3() {
  const ps = all().filter(p => p.r3?.quad);
  const names = ['카드별 정답 공개', '우리 반 vs 정답', '아이젠하워 매트릭스', '판단 기준과 처리 방법', '전체 마무리'];
  const s = H.scene.r3;
  let body = '';
  const dist = (c) => { const a = ps.map(p => p.r3.quad[c.id]).filter(Boolean); return { a, n: a.length }; };
  if (s === 0) {
    const i = H.r3card, c = R3_CARDS[i], open = H.r3open;
    const { a, n } = dist(c);
    body = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        ${R3_CARDS.map((x, k) => `<button class="h-btn sm" style="${k === i ? 'background:var(--navy);color:#fff' : 'background:#eef1f5'}" data-act="r3card" data-v="${k}">${k + 1}</button>`).join('')}
        <span style="color:var(--muted);margin-left:8px">응답 ${n}명</span></div>
      <div class="s-title">${i + 1}. ${esc(c.title)}</div><div class="s-sub">⏰ 마감: ${esc(c.due)} · ⚠️ 안 하면: ${esc(c.risk)} · 👥 ${esc(c.who)}</div>
      ${hostMatrix(q => `<div class="bigpct ${open && q === c.q ? 'hit' : ''}">${pct(a.filter(x => x === q).length, n)}%</div>`, open)}
      ${open ? `<div class="answer"><div class="ans-h"><span>정답</span><b>${QUADS[c.q].dot} ${QUADS[c.q].label}</b><i>→</i><b>${QUADS[c.q].action}</b></div><p>${esc(c.reason)}</p></div>`
        : `<div style="text-align:center;margin-top:20px"><button class="btn" style="max-width:360px;margin:0 auto;font-size:22px" data-act="r3open">정답 공개</button></div>`}
      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <button class="h-btn" style="background:#eef1f5" data-act="r3card" data-v="${Math.max(0, i - 1)}" ${i === 0 ? 'disabled' : ''}>◀ 이전 카드</button>
        ${i < R3_CARDS.length - 1 ? `<button class="h-btn" style="background:var(--navy);color:#fff" data-act="r3card" data-v="${i + 1}">다음 카드 ▶</button>` : `<button class="h-btn" style="background:var(--navy);color:#fff" data-act="scene" data-k="r3" data-v="1">우리 반 vs 정답 ▶</button>`}</div>`;
  } else if (s === 1) {
    const major = Object.fromEntries(R3_CARDS.map(c => { const { a } = dist(c); let best = 0, bq = 0; for (const q of [1, 2, 3, 4]) { const k = a.filter(x => x === q).length; if (k > best) { best = k; bq = q; } } return [c.id, bq]; }));
    const chips = (map, mark) => (q) => R3_CARDS.filter(c => map[c.id] === q).map(c => `<div class="chip ${mark && c.q !== q ? 'hl' : ''}"><span>${esc(c.title)}</span></div>`).join('');
    body = `<div class="s-title">우리 반 매트릭스 vs 정답 매트릭스</div><div class="s-sub">우리 반 = 가장 많은 분이 넣은 칸 (응답 ${ps.length}명) · 주황 테두리 = 정답과 다른 카드</div>
      <div class="grid-cards"><div><h3 style="margin:0 0 8px">우리 반</h3>${hostMatrix(chips(major, true))}</div>
      <div><h3 style="margin:0 0 8px">정답</h3>${hostMatrix(chips(Object.fromEntries(R3_CARDS.map(c => [c.id, c.q]))), true)}</div></div>`;
  } else if (s === 2) {
    body = `<div class="s-title">아이젠하워 매트릭스</div><div class="s-sub">중요도 × 긴급성으로 업무를 나누고, 칸마다 처리 방법을 정합니다</div>
      ${hostMatrix(q => `<div class="model"><b>${QUADS[q].action}</b><span>${QUADS[q].how}</span></div>`)}`;
  } else if (s === 3) {
    body = `<div class="s-title">세 가지 판단 기준</div>
      <table class="tbl"><tr><td><b>⏰ 긴급성</b></td><td>이번 주 안에 끝내야 하는가?</td></tr><tr><td><b>⚠️ 중요도</b></td><td>안 하면 평가·서비스·고객에 큰 영향이 있는가?</td></tr><tr><td><b>👥 담당</b></td><td>내가 꼭 해야 하는가? 다른 사람이 해도 되는 일인가?</td></tr></table>
      <div style="height:16px"></div>
      <table class="tbl"><tr><th>칸</th><th>처리 방법</th><th>김대리 예시</th></tr>
      ${[1, 2, 3, 4].map(q => `<tr><td>${QUADS[q].dot} ${QUADS[q].label} · <b>${QUADS[q].action}</b></td><td><b>${QUADS[q].how}</b></td><td>${R3_CARDS.filter(c => c.q === q).map(c => esc(c.title.replace(/^.+?: /, ''))).join(', ')}</td></tr>`).join('')}</table>
      ${say('업무 유형은 <b>어떻게 처리할지</b>를, 매트릭스는 <b>무엇부터 할지</b>를 정합니다. 프로젝트성 업무는 급하지 않을 때 <b>미리 일정에 넣어야</b> 합니다.')}
      ${say('지금 긴급 상황이 터져서 하나를 미뤄야 한다면, 어느 칸에서 빼시겠어요? → <b>일정 계획 칸을 미리 잡아 두지 않으면, 급한 일이 생길 때마다 가장 먼저 사라집니다.</b>')}`;
  } else if (s === 4) {
    body = viewEndInner();
  }
  return sceneNav('r3', names) + body;
}

function viewEndInner() {
  return `<div style="text-align:center;padding:30px 0 10px"><div class="s-title" style="font-size:48px">${esc(FINAL.slogan)}</div><div class="s-sub">${esc(FINAL.sub)}</div></div>
    <table class="tbl"><tr><th>ROUND</th><th>질문</th><th>도구</th></tr>${FINAL.rows.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>`;
}

// ---------------- CSV ----------------
function exportCSV() {
  const ps = H.players;
  const head = ['닉네임'];
  R1_CARDS.forEach((c, i) => head.push(`R1-${i + 1} 유형`, `R1-${i + 1} 전략`));
  head.push('R1 유형점수', 'R1 전략점수');
  R2_PIECES.forEach((p, i) => head.push(`R2 배치-${i + 1} ${p.title}`));
  R2_REFINE.forEach(q => head.push(`R2 구체화 ${q.big}`));
  head.push('R2 빠진작업 선택', 'R2 빠진작업 찾은 수');
  R3_CARDS.forEach(c => head.push(`R3 ${c.title}`));
  const tl = (id) => TYPES.find(t => t.id === id)?.label || '';
  const sl = (id) => STRATEGIES.find(t => t.id === id)?.label || '';
  const gl = (id) => R2_GROUPS.find(t => t.id === id)?.label || '';
  const rows = ps.map(p => {
    const r = [p.nick || ''];
    R1_CARDS.forEach(c => { const a = p.r1?.answers?.[c.id] || {}; r.push(tl(a.type), sl(a.strat)); });
    const s1 = scoreR1(p.r1); r.push(s1.type, s1.strat);
    R2_PIECES.forEach(x => r.push(gl(p.r2?.place?.[x.id])));
    R2_REFINE.forEach(q => r.push(q.options.find(o => o.id === p.r2?.refine?.[q.id])?.text || ''));
    r.push((p.r2?.missing || []).map(id => R2_MISSING.find(m => m.id === id)?.text).join(' / '), scoreR2(p.r2).found);
    R3_CARDS.forEach(c => { const q = p.r3?.quad?.[c.id]; r.push(q ? `${q}사분면` : ''); });
    return r;
  });
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `김대리의한달_결과_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ---------------- 렌더 ----------------
function render() {
  if (!H.authed) {
    $.innerHTML = `<div class="pin"><h2 style="margin-top:0">강사 화면</h2><p class="p-sub">비밀번호를 입력하세요</p>
      <input class="txt" id="pin" type="password" inputmode="numeric" style="text-align:center"><div style="height:12px"></div>
      <button class="btn" data-act="pin">들어가기</button></div>`;
    const el = document.getElementById('pin');
    el.focus(); el.addEventListener('keydown', e => { if (e.key === 'Enter') act('pin'); });
    return;
  }
  const ph = H.session?.phase || 'lobby';
  const idx = PHASES.findIndex(p => p.id === ph);
  const ps = all();
  const joined = ps.filter(p => p.nick).length;
  const curKey = ph.startsWith('r') ? 'r' + ph[1] : null;
  const done = curKey ? ps.filter(p => p[curKey]?.done).length : 0;
  const next = PHASES[idx + 1];
  const scroll = document.querySelector('.stage')?.scrollTop || 0;
  $.innerHTML = `
    <div class="h-bar"><span class="ttl">김대리의 한 달 · 강사 화면</span>
      <span class="stat">접속 <b>${joined}</b>명</span>
      ${curKey ? `<span class="stat">R${ph[1]} 제출 <b>${done}</b> / ${joined}</span>` : ''}
      ${store.mode === 'demo' ? '<span class="stat" style="background:#ffe3cc;color:#8a4300">로컬 데모 모드</span>' : ''}
      <span class="sp"></span>
      <button class="h-btn sm ${H.useFake ? 'on' : ''}" data-act="fake">${H.useFake ? '가상 70명 표시 중' : '가상 70명 리허설'}</button>
      <button class="h-btn sm" data-act="csv">결과 내려받기</button>
      <button class="h-btn sm warn" data-act="reset">${H.resetArm ? '정말 새로 시작? 한 번 더 클릭' : '새 세션'}</button>
      ${next ? `<button class="h-btn" data-act="phase" data-v="${next.id}">다음: ${next.label} ▶</button>` : ''}
    </div>
    <div class="phases">${PHASES.map((p, i) => `<button class="ph ${p.id === ph ? 'cur' : i < idx ? 'done' : ''}" data-act="phase" data-v="${p.id}">${p.label}</button>`).join('')}</div>
    <div class="tabs">${[['live', '진행 현황'], ['r1', 'R1 결과'], ['r2', 'R2 결과'], ['r3', 'R3 결과'], ['end', '마무리']].map(([k, l]) => `<button class="tab ${H.tab === k ? 'cur' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}
      ${COURSE_TITLE ? `<span style="margin-left:auto;align-self:center;color:var(--muted);font-size:13px">${esc(COURSE_TITLE)}</span>` : ''}</div>
    <div class="stage">${H.tab === 'live' ? viewLive() : H.tab === 'r1' ? viewR1() : H.tab === 'r2' ? viewR2() : H.tab === 'r3' ? viewR3() : viewEndInner()}</div>`;
  const qr = document.getElementById('qr');
  if (qr && window.QRCode) new window.QRCode(qr, { text: playerURL(), width: 260, height: 260 });
  const st = document.querySelector('.stage'); if (st) st.scrollTop = scroll;
}

// ---------------- 이벤트 ----------------
async function act(a, v, el) {
  switch (a) {
    case 'pin': {
      const val = document.getElementById('pin').value.trim();
      if (val === HOST_PIN) { H.authed = true; try { sessionStorage.setItem('kimdaeri_host', '1'); } catch {} start(); }
      else { document.getElementById('pin').value = ''; document.getElementById('pin').placeholder = '다시 입력하세요'; }
      return;
    }
    case 'phase': {
      await store.setSession({ phase: v, updatedAt: Date.now() });
      if (v.endsWith('_close')) { H.tab = 'r' + v[1]; H.scene['r' + v[1]] = 0; if (v === 'r1_close') { H.r1card = 0; H.r1open = false; } if (v === 'r3_close') { H.r3card = 0; H.r3open = false; } }
      else if (v === 'end') H.tab = 'end';
      else H.tab = 'live';
      break;
    }
    case 'tab': H.tab = v; break;
    case 'r1card': H.r1card = +v; H.r1open = false; break;
    case 'r1open': H.r1open = true; break;
    case 'r3card': H.r3card = +v; H.r3open = false; break;
    case 'r3open': H.r3open = true; break;
    case 'scene': H.scene[el.dataset.k] = +v; break;
    case 'flip': {
      H.flipped.has(v) ? H.flipped.delete(v) : H.flipped.add(v);
      el.classList.toggle('open', H.flipped.has(v));
      setTimeout(render, 700);
      return;
    }
    case 'fake': H.useFake = !H.useFake; if (H.useFake && !H.fake.length) H.fake = makeFake(70); break;
    case 'csv': exportCSV(); return;
    case 'reset': {
      if (!H.resetArm) { H.resetArm = true; render(); setTimeout(() => { H.resetArm = false; render(); }, 4000); return; }
      H.resetArm = false;
      const runId = 'run-' + Date.now().toString(36);
      await store.setSession({ runId, phase: 'lobby', updatedAt: Date.now() });
      H.tab = 'live'; H.flipped.clear(); H.scene = { r1: 0, r2: 0, r3: 0 }; H.r1card = 0; H.r1open = false; H.r3card = 0; H.r3open = false;
      break;
    }
  }
  render();
}
$.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  e.preventDefault();
  act(t.dataset.act, t.dataset.v, t);
});

let curRun = null;
let rTimer = null;
function scheduleRender() {
  if (rTimer) return;
  rTimer = setTimeout(() => { rTimer = null; render(); }, 600);
}
async function start() {
  render();
  try { await store.init(); } catch (e) { $.innerHTML = `<div class="pin"><h2>연결 실패</h2><p>${esc(e.message)}</p></div>`; return; }
  store.subscribeSession(async (sess, err) => {
    if (err) { console.error(err); return; }
    if (!sess || !sess.runId) { await store.setSession({ runId: 'run-' + Date.now().toString(36), phase: 'lobby', updatedAt: Date.now() }); return; }
    H.session = sess;
    if (sess.runId !== curRun) {
      curRun = sess.runId;
      H.unsub && H.unsub();
      H.players = [];
      H.unsub = store.subscribePlayers(curRun, (list) => { H.players = list; scheduleRender(); });
    }
    render();
  });
}
if (H.authed) start(); else render();
