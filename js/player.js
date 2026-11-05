import { store, saveWithRetry, onNet, safeLS } from './store.js';
import {
  KIM, TYPES, STRATEGIES, R1_CARDS, R2_MISSION, R2_GROUPS, R2_PIECES, R2_REFINE, R2_MISSING, R2_ANSWER_TREE, sortedIn, CIRC,
  R3_INTRO, R3_CARDS, QUADS, QUAD_LAYOUT, FINAL,
  scoreR1, scoreR2, scoreR3,
} from './content.js';

const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// pid 저장: 데모 모드는 탭별(sessionStorage), 실전은 기기별(localStorage)
const idStore = {
  get(k) { try { return (store.mode === 'demo' ? sessionStorage : localStorage).getItem(k); } catch { return null; } },
  set(k, v) { try { (store.mode === 'demo' ? sessionStorage : localStorage).setItem(k, v); } catch {} },
};

const S = {
  session: null,
  runId: null,
  pid: null,
  me: null,       // 내 응답 (로컬 사본)
  ui: { r1: { started: false, i: 0, step: 'type' }, r2: { started: false, step: 's1', i: 0, q: 0, sub: 'group', miss: [] }, r3: { started: false, sel: null } },
  nickDraft: '',
  error: null,
};

function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function save(partial) {
  S.me = deepMergeLocal(S.me || {}, partial);
  saveWithRetry(S.runId, S.pid, partial);
  render();
}
function deepMergeLocal(a, b) {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b)) {
    const v = b[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? deepMergeLocal(out[k], v) : v;
  }
  return out;
}

// ---------------- 화면 조각 ----------------
function top(label) {
  return `<div class="p-top"><span class="badge">${esc(label)}</span><span>${S.me?.nick ? `<span class="nick">${esc(S.me.nick)}</span> 님` : ''}</span></div>`;
}
function sticky(html) { return `<div class="sticky"><div class="inner">${html}</div></div>`; }
function kimBox(criteria) {
  return `<div class="box"><div class="kim"><div class="av">🧑‍💼</div><div>
    <b>${KIM.name}</b> <span class="note" style="margin:0">| ${KIM.team}</span>
    <p style="margin-top:6px;font-size:15px">${esc(KIM.intro)}</p></div></div>
    <div class="crit"><b>김대리의 평가 기준</b><br>${esc(criteria || KIM.criteria)}</div></div>`;
}
function waitBox(icon, title, sub) {
  return `<div class="wait"><div class="ic">${icon}</div><h2>${title}</h2><p class="p-sub">${sub}</p></div>`;
}

// ---------------- 입장 ----------------
function viewJoin() {
  return `<div style="padding-top:8vh">
    <span class="badge alt">업무관리 시뮬레이션</span>
    <h1 class="p-title">김대리의 한 달</h1>
    <p class="p-sub">닉네임을 입력하고 입장해 주세요.<br>이름이나 사번은 입력하지 않아도 됩니다.</p>
    <input class="txt" id="nick" maxlength="12" placeholder="닉네임 (최대 12자)" value="${esc(S.nickDraft)}" autocomplete="off">
    <div style="height:14px"></div>
    <button class="btn" data-act="join">입장하기</button>
    ${S.error ? `<p class="note" style="color:var(--bad)">${esc(S.error)}</p>` : ''}
  </div>`;
}

function viewLobby() {
  return top('대기실') + waitBox('⏳', '곧 시작합니다<span class="dots"></span>', '강사님이 시작하면 화면이 자동으로 바뀝니다.<br>화면을 켜 둔 채로 기다려 주세요.') +
    `<div class="box"><h3>오늘의 게임</h3><p>여러분은 <b>김대리</b>가 되어 세 번의 라운드를 진행합니다.</p>
    <p>ROUND 1 나누기 · ROUND 2 쪼개기 · ROUND 3 순서 정하기</p></div>`;
}

// ---------------- ROUND 1 ----------------
function r1Strats() { return seededShuffle(STRATEGIES, hash(S.pid || 'x')); }

function viewR1() {
  const r1 = S.me?.r1 || {};
  const ui = S.ui.r1;
  if (r1.done) return viewR1Result(true);
  if (!ui.started && !Object.keys(r1.answers || {}).length) {
    return top('ROUND 1 · 나누기') + `<h1 class="p-title">김대리의 업무를 나눠라!</h1>` + kimBox() +
      `<div class="mission"><b>MISSION</b><br>김대리의 업무 8가지를 보고 ① 어떤 유형인지 ② 어떻게 처리하는 게 좋을지 골라 주세요.</div>
      <p class="note">교육용 가상 상황입니다.</p>` + sticky(`<button class="btn" data-act="r1start">시작하기</button>`);
  }
  ui.started = true;
  // 이어하기: 첫 미응답 카드
  const ans = r1.answers || {};
  if (ui.i >= R1_CARDS.length || ans[R1_CARDS[ui.i]?.id]?.strat) {
    const idx = R1_CARDS.findIndex(c => !ans[c.id]?.strat);
    if (idx === -1) { save({ r1: { done: true } }); return ''; }
    ui.i = idx; ui.step = ans[R1_CARDS[idx].id]?.type ? 'strat' : 'type';
  }
  const c = R1_CARDS[ui.i];
  const a = ans[c.id] || {};
  const pct = (ui.i / R1_CARDS.length) * 100;
  let body = `<div class="task"><div class="no">업무 카드 ${ui.i + 1} / ${R1_CARDS.length}</div><div class="tt">${esc(c.title)}</div><div class="tx">${esc(c.text)}</div></div>`;
  if (ui.step === 'type') {
    body += `<div class="q">Q1. 이 업무는 어떤 유형인가요?</div><div class="opts two">` +
      TYPES.map(t => `<button class="opt two ${a.type === t.id ? 'sel' : ''}" data-act="r1type" data-v="${t.id}">${t.label}</button>`).join('') + `</div>`;
  } else {
    const tl = TYPES.find(t => t.id === a.type)?.label;
    body += `<div class="note" style="margin-bottom:-6px">Q1 선택: <b>${esc(tl)}</b> <a href="#" data-act="r1back" style="color:var(--navy)">다시 고르기</a></div>`;
    body += `<div class="q" style="margin-bottom:2px">Q2. 어떻게 처리하는 게 좋을까요?</div><div class="hint">보기의 한 줄 설명을 읽고 고르세요</div><div class="opts">` +
      r1Strats().map(s => `<button class="opt ${a.strat === s.id ? 'sel' : ''}" data-act="r1strat" data-v="${s.id}"><b>${s.label}</b><small>${s.desc}</small></button>`).join('') + `</div>`;
  }
  return top('ROUND 1 · 나누기') + `<div class="progress"><i style="width:${pct}%"></i></div>` + body;
}

function viewR1Result(waiting) {
  const sc = scoreR1(S.me?.r1);
  let msg = '강사님 설명에서 함께 확인해 봐요!';
  if (sc.strat < sc.type) msg = '업무는 잘 나누셨는데, 처리 방법에서 차이가 있네요!';
  else if (sc.type >= 7 && sc.strat >= 7) msg = '업무 성격과 처리 방법을 모두 잘 짚으셨어요!';
  return top('ROUND 1 · 결과') + `<h1 class="p-title">나의 결과</h1>
    <div class="score"><div><b>${sc.type} / ${sc.total}</b><span>유형 분류</span></div><div><b>${sc.strat} / ${sc.total}</b><span>처리 전략</span></div></div>
    <div class="box"><p style="font-size:17px;font-weight:700;margin:0">${msg}</p></div>` +
    (waiting ? waitBox('👀', '다른 분들을 기다리는 중<span class="dots"></span>', '모두 끝나면 강사님이 결과를 공개합니다.') : '');
}

// ---------------- ROUND 2 ----------------
function viewR2() {
  const r2 = S.me?.r2 || {};
  const ui = S.ui.r2;
  if (r2.done) return viewR2Result(true);
  const started = ui.started || r2.place;
  if (!started) {
    return top('ROUND 2 · 쪼개기') + `<h1 class="p-title">김대리의 프로젝트를 쪼개라!</h1>
      <div class="box"><h3>💬 팀장님</h3><p>${esc(R2_MISSION.boss)}</p></div>
      <div class="box"><p>${esc(R2_MISSION.situation)}</p><p style="margin:0">${esc(R2_MISSION.plan)}</p></div>
      <div class="mission"><b>MISSION</b><br>작업을 알맞은 묶음에 넣고, 너무 큰 작업은 구체화하고, 빠진 작업을 찾아 주세요.</div>` +
      sticky(`<button class="btn" data-act="r2start">시작하기</button>`);
  }
  ui.started = true;
  const place = r2.place || {};
  // 단계 결정
  const refine = r2.refine || {};
  if (ui.step === 's1' && Object.keys(refine).length) ui.step = 's2';
  if (ui.step === 's2') {
    const nq = R2_REFINE.findIndex(q => !refine[q.id + '_g'] || !refine[q.id]);
    if (nq === -1) ui.step = 's3'; else { ui.q = nq; ui.sub = refine[R2_REFINE[nq].id + '_g'] ? 'child' : 'group'; }
  }

  if (ui.step === 's1') {
    const pool = R2_PIECES.filter(p => !place[p.id]);
    const placedN = R2_PIECES.length - pool.length;
    const chip = (p, inBox, i) => `<button class="chip-btn ${ui.sel === p.id ? 'picked' : ''} ${inBox ? 'in' : ''}" data-act="${inBox ? 'r2unplace' : 'r2pick'}" data-v="${p.id}">${inBox ? `<i class="num">${CIRC[i]}</i>` : ''}${esc(p.title)}${p.dept ? `<em>${esc(p.dept)}</em>` : ''}</button>`;
    const box = (g) => {
      const items = sortedIn(g.id, place);
      return `<div class="wbox ${g.id === 'big' ? 'bin' : ''} ${ui.sel ? 'ready' : ''}" data-act="r2drop" data-v="${g.id}">
        <div class="wl">${g.id === 'big' ? '✂️ ' : ''}${g.label}${g.hint ? `<small>${esc(g.hint)}</small>` : ''}</div>
        <div class="wi">${items.map((p, i) => chip(p, true, i)).join('') || (ui.sel ? '<span class="ph-in">여기에 넣기</span>' : '')}</div></div>`;
    };
    return top('ROUND 2 · STEP 1 작업 배치하기') +
      `<p class="p-sub" style="margin:0 0 10px">① 아래 작업 카드를 누르고 ② 넣을 칸을 누르세요. 넣은 카드를 다시 누르면 빠집니다.</p>
      <div class="wtree"><div class="wroot">앱 개선 프로젝트</div><div class="wlines"></div>
        <div class="wcols">${R2_GROUPS.filter(g => g.id !== 'big').map(box).join('')}</div>
        ${box(R2_GROUPS.find(g => g.id === 'big'))}</div>
      <div class="pool-h">아직 넣지 않은 작업 ${pool.length}개</div>
      <div class="pool">${pool.map(p => chip(p, false)).join('') || '<span class="note">모든 작업을 넣었어요!</span>'}</div>` +
      sticky(`<button class="btn" data-act="r2next" ${pool.length ? 'disabled' : ''}>${pool.length ? `작업을 모두 넣어 주세요 (${placedN}/${R2_PIECES.length})` : '다음 단계로'}</button>`);
  }
  if (ui.step === 's2') {
    const q = R2_REFINE[ui.q];
    const done = ui.q * 2 + (ui.sub === 'child' ? 1 : 0);
    const head = top('ROUND 2 · STEP 2 더 구체화하기') + `<div class="progress"><i style="width:${(done / (R2_REFINE.length * 2)) * 100}%"></i></div>
      <div class="task"><div class="no">✂️ 더 쪼개야 할 작업 ${ui.q + 1} / ${R2_REFINE.length}</div><div class="tt">${esc(q.big)}</div></div>`;
    if (ui.sub === 'group') {
      return head + `<div class="q">Q1. 「${esc(q.big)}」는 구조도에서 어디에 들어갈까요?</div><div class="opts">` +
        R2_GROUPS.filter(g => g.id !== 'big').map(g => `<button class="opt two" data-act="r2refineg" data-v="${g.id}">${g.label} 아래</button>`).join('') + `</div>`;
    }
    const gl = R2_GROUPS.find(g => g.id === refine[q.id + '_g'])?.label || '';
    return head + `<div class="note" style="margin-bottom:-6px">Q1 선택: <b>${esc(gl)} 아래</b> <a href="#" data-act="r2back" style="color:var(--navy)">다시 고르기</a></div>
      <div class="q">Q2. 「${esc(q.big)}」는 범위가 크기 때문에 쪼갠다면, 그 아래에 들어갈 구체적인 작업은?</div><div class="opts">` +
      q.options.map(o => `<button class="opt" data-act="r2refine" data-v="${o.id}"><b>${esc(o.text)}</b></button>`).join('') + `</div>`;
  }
  // s3
  const tree = R2_GROUPS.filter(g => g.id !== 'big').map(g => `<div class="tcol"><b>${g.label}</b>${sortedIn(g.id, place).map((p, i) => `<span>${CIRC[i]} ${esc(p.title)}</span>`).join('')}</div>`).join('');
  return top('ROUND 2 · STEP 3 빠진 작업 찾기') +
    `<div class="mytree"><div class="wroot" style="margin-bottom:8px">내가 만든 앱 개선 프로젝트</div><div class="tcols">${tree}</div></div>
    <div class="box"><p style="margin:0;font-weight:700;font-size:17px">이대로 출시하면 문제가 생깁니다.<br>빠진 작업을 모두 골라 주세요.</p><p class="note">여러 개 선택할 수 있어요.</p></div>
    <div class="opts">` +
    R2_MISSING.map(m => `<button class="opt check ${ui.miss.includes(m.id) ? 'sel' : ''}" data-act="r2miss" data-v="${m.id}">${esc(m.text)}</button>`).join('') +
    `</div>` + sticky(`<button class="btn" data-act="r2done" ${ui.miss.length ? '' : 'disabled'}>제출하기</button>`);
}

function viewR2Result(waiting) {
  const s = scoreR2(S.me?.r2);
  return top('ROUND 2 · 결과') + `<h1 class="p-title">나의 결과</h1>
    <div class="score" style="grid-template-columns:1fr 1fr 1fr">
      <div><b>${s.s1}/${s.t1}</b><span>작업 배치</span></div>
      <div><b>${s.s2}/${s.t2}</b><span>구체화</span></div>
      <div><b>${s.found}/${s.t3}</b><span>빠진 작업</span></div></div>
    <div class="box"><p style="font-size:16px;font-weight:700;margin:0">${s.found < s.t3 ? `빠진 작업 ${s.t3 - s.found}개를 놓치셨어요. 어떤 작업이었을까요?` : '빠진 작업을 모두 찾으셨어요!'}</p></div>` +
    (waiting ? waitBox('👀', '다른 분들을 기다리는 중<span class="dots"></span>', '모두 끝나면 강사님이 결과를 공개합니다.') : '');
}

// ---------------- ROUND 3 ----------------
function matrixHTML(quad, opts = {}) {
  const cell = (q) => {
    const items = R3_CARDS.filter(c => quad[c.id] === q);
    const inner = items.map(c => opts.board
      ? `<button class="chip-btn in ${S.ui.r3.sel === c.id ? 'picked' : ''}" data-act="r3unplace" data-v="${c.id}">${esc(c.title)}</button>`
      : `<span class="mchip ${opts.marks && opts.marks[c.id] === false ? 'wrong' : ''}">${esc(c.title)}</span>`).join('');
    return `<div class="mq ${QUADS[q].cls} ${opts.board && S.ui.r3.sel ? 'ready' : ''}" ${opts.board ? `data-act="r3drop" data-v="${q}"` : ''}>
      <div class="mql">${QUADS[q].label}${opts.answer ? `<b>${QUADS[q].action}</b>` : ''}</div>${inner || (opts.board && S.ui.r3.sel ? '<span class="ph-in">여기에 넣기</span>' : '')}</div>`;
  };
  return `<div class="mtx2 ${opts.small ? 'small' : ''}"><div class="ay">중요도 ▲</div><div class="mgrid">${QUAD_LAYOUT.map(cell).join('')}</div><div></div><div class="ax2">긴급성 ▶</div></div>`;
}

function viewR3() {
  const r3 = S.me?.r3 || {};
  const ui = S.ui.r3;
  if (r3.done) return viewR3Result(true);
  if (!ui.started && !r3.quad) {
    return top('ROUND 3 · 순서 정하기') + `<h1 class="p-title">김대리의 이번 주, 무엇부터?</h1>
      <div class="box"><p>월요일 아침, 김대리의 이번 주 업무가 쌓여 있습니다.</p>
      <div class="crit"><b>김대리의 평가 기준</b><br>${esc(R3_INTRO.criteria)}</div></div>
      <div class="box"><h3>세 가지 질문으로 판단하세요</h3><p>⏰ <b>${esc(R3_INTRO.urgent)}</b></p><p>⚠️ <b>${esc(R3_INTRO.important)}</b></p><p style="margin:0">👥 <b>${esc(R3_INTRO.who)}</b></p></div>
      <div class="mission"><b>MISSION</b><br>김대리의 업무 9가지를 아이젠하워 매트릭스의 알맞은 칸에 넣어 주세요.</div>` +
      sticky(`<button class="btn" data-act="r3start">시작하기</button>`);
  }
  ui.started = true;
  const quad = r3.quad || {};
  const pool = seededShuffle(R3_CARDS, hash((S.pid || 'x') + 'r3')).filter(c => !quad[c.id]);
  return top('ROUND 3 · 매트릭스에 넣기') +
    `<p class="p-sub" style="margin:0 0 10px">① 아래 업무 카드를 누르고 ② 넣을 칸을 누르세요. 넣은 카드를 다시 누르면 빠집니다.</p>
    <div class="crit3">⏰ 급한가? 이번 주 안 · ⚠️ 중요한가? 큰 영향 · 👥 내가 꼭 해야 하나?</div>
    <div class="wtree">${matrixHTML(quad, { board: true })}</div>
    <div class="pool-h">아직 넣지 않은 업무 ${pool.length}개</div>
    ${pool.map(c => `<button class="r3row ${ui.sel === c.id ? 'picked' : ''}" data-act="r3pick" data-v="${c.id}">
      <div class="bd"><b>${esc(c.title)}</b><span>⏰ 마감: ${esc(c.due)}</span><span>⚠️ 안 하면: ${esc(c.risk)}</span><span>👥 누가: ${esc(c.who)}</span></div></button>`).join('') || '<p class="note">모든 업무를 넣었어요!</p>'}` +
    sticky(`<button class="btn" data-act="r3done" ${pool.length ? 'disabled' : ''}>${pool.length ? `업무를 모두 넣어 주세요 (${R3_CARDS.length - pool.length}/${R3_CARDS.length})` : '제출하기'}</button>`);
}

function viewR3Result(waiting) {
  const r3 = S.me?.r3 || {};
  const quad = r3.quad || {};
  const sc = scoreR3(r3);
  const answer = Object.fromEntries(R3_CARDS.map(c => [c.id, c.q]));
  const marks = Object.fromEntries(R3_CARDS.map(c => [c.id, quad[c.id] === c.q]));
  const wrong = R3_CARDS.filter(c => quad[c.id] && quad[c.id] !== c.q);
  return top('ROUND 3 · 결과') + `<h1 class="p-title">내 매트릭스 vs 정답</h1>
    <div class="score" style="grid-template-columns:1fr"><div><b>${sc.ok} / ${sc.total}</b><span>정답과 같은 칸에 넣은 업무</span></div></div>
    <div class="box"><h3>내 매트릭스</h3>${matrixHTML(quad, { small: true, marks })}<p class="note">빨간 테두리 = 정답과 다른 칸</p></div>
    <div class="box"><h3>정답 매트릭스</h3>${matrixHTML(answer, { small: true, answer: true })}</div>
    ${wrong.length ? `<div class="box"><h3>다르게 넣은 업무</h3>${wrong.map(c => `<div class="fb"><b>${esc(c.title)}</b> → 정답 ${QUADS[c.q].dot} ${QUADS[c.q].label} · <b>${QUADS[c.q].action}</b><br>${esc(c.reason)}</div>`).join('')}</div>` : ''}` +
    (waiting ? waitBox('👀', '다른 분들을 기다리는 중<span class="dots"></span>', '모두 끝나면 강사님이 결과를 공개합니다.') : '');
}

// ---------------- 마감/마무리 ----------------
function myR1Answers() {
  const ans = S.me?.r1?.answers || {};
  const tl = (id) => TYPES.find(t => t.id === id)?.label || '-';
  const sl = (id) => STRATEGIES.find(t => t.id === id)?.short || '-';
  return `<div class="box"><h3>내 답 vs 정답</h3>` + R1_CARDS.map((c, i) => {
    const a = ans[c.id] || {};
    const okT = c.type.includes(a.type), okS = a.strat === c.strat;
    return `<div class="myans"><div class="mt">${i + 1}. ${esc(c.title)}</div>
      <div class="mr"><span class="${okT ? 'ok' : 'ng'}">${okT ? '✅' : '❌'} ${esc(tl(a.type))}</span><span class="ans">정답 ${esc(tl(c.type[0]))}</span></div>
      <div class="mr"><span class="${okS ? 'ok' : 'ng'}">${okS ? '✅' : '❌'} ${esc(sl(a.strat))}</span><span class="ans">정답 ${esc(sl(c.strat))}</span></div></div>`;
  }).join('') + `</div>`;
}
function answerTreeHTML() {
  return `<div class="tcols">${R2_ANSWER_TREE.map(col => `<div class="tcol"><b>${R2_GROUPS.find(g => g.id === col.g).label}</b>${col.items.map((it, i) => `<span class="${it.miss ? 'miss' : ''} ${it.big ? 'bigit' : ''}">${CIRC[i]} ${esc(it.t)}${it.big ? ' ✂️' : ''}${it.child ? `<small>└ ${esc(it.child)}</small>` : ''}</span>`).join('')}</div>`).join('')}</div>`;
}
function myR2Answers() {
  const r2 = S.me?.r2 || {}; const place = r2.place || {}; const refine = r2.refine || {};
  const my = `<div class="tcols four">${R2_GROUPS.map(g => `<div class="tcol"><b>${g.id === 'big' ? '✂️ ' : ''}${g.label}</b>${sortedIn(g.id, place).map((p, i) => `<span class="${!p.ans.includes(g.id) ? 'ng' : ''}">${CIRC[i]} ${esc(p.title)}</span>`).join('')}</div>`).join('')}</div>`;
  const miss = r2.missing || [];
  const gl = (id) => R2_GROUPS.find(g => g.id === id)?.label || '-';
  const refineRows = R2_REFINE.map(q => {
    const okG = refine[q.id + '_g'] === q.group; const o = q.options.find(o => o.id === refine[q.id]); const okC = !!(o && o.correct);
    return `<div class="myans"><div class="mt">✂️ ${esc(q.big)}</div>
      <div class="mr"><span class="${okG ? 'ok' : 'ng'}">${okG ? '✅' : '❌'} ${esc(gl(refine[q.id + '_g']))} 아래</span><span class="ans">정답 ${esc(gl(q.group))} 아래</span></div>
      <div class="mr"><span class="${okC ? 'ok' : 'ng'}">${okC ? '✅' : '❌'} ${esc(o?.text || '-')}</span><span class="ans">정답 ${esc(q.child)}</span></div></div>`;
  }).join('');
  return `<div class="box"><h3>내가 만든 구조도</h3>${my}<p class="note">빨간 테두리 = 정답과 다른 곳 · 틀린 카드는 칸의 맨 뒤 번호</p></div>
    <div class="box"><h3>더 구체화하기</h3>${refineRows}</div>
    <div class="box"><h3>정답 구조도</h3>${answerTreeHTML()}<p class="note">★ 주황 = 빠진 작업 · ✂️ = 더 쪼갠 작업</p></div>
    <div class="box"><h3>빠진 작업 정답</h3>${R2_MISSING.map(m => `<div class="myans"><div class="mr"><span class="${m.correct === miss.includes(m.id) ? 'ok' : 'ng'}">${m.correct === miss.includes(m.id) ? '✅' : '❌'} ${esc(m.text)}</span><span class="ans">${m.correct ? '빠진 작업 · ' + esc(m.tag) : esc(m.tag)}</span></div></div>`).join('')}</div>`;
}
function viewClosed(n) {
  const done = S.me?.[`r${n}`];
  let res = '';
  if (n === 1) res = viewR1Result(false) + myR1Answers();
  else if (n === 2) res = viewR2Result(false) + myR2Answers();
  else res = viewR3Result(false);
  return waitBox('🎤', `ROUND ${n} 마감`, '이제 화면을 보며 강사님 설명을 들어 주세요.') + (done ? res : `<p class="p-sub" style="text-align:center">이번 라운드는 마감되었어요.</p>`);
}
function viewEnd() {
  return top('마무리') + `<div class="wait"><div class="ic">🏁</div><h2>${esc(FINAL.slogan)}</h2><p class="p-sub">${esc(FINAL.sub)}</p></div>
    <div class="box">${FINAL.rows.map(r => `<p><b>${esc(r[0])}</b><br>${esc(r[1])} → ${esc(r[2])}</p>`).join('')}</div>
    <p class="note" style="text-align:center">참여해 주셔서 감사합니다!</p>`;
}

// ---------------- 렌더 ----------------
function render() {
  const sess = S.session;
  let html;
  if (sess === undefined) html = waitBox('📡', '연결 중<span class="dots"></span>', '잠시만 기다려 주세요.');
  else if (!sess || !sess.runId) html = waitBox('⏳', '아직 시작 전입니다', '강사님이 준비 중이에요. 잠시 후 다시 확인해 주세요.');
  else if (!S.me?.nick) html = viewJoin();
  else {
    const ph = sess.phase || 'lobby';
    if (ph === 'lobby') html = viewLobby();
    else if (ph === 'r1') html = viewR1();
    else if (ph === 'r2') html = viewR2();
    else if (ph === 'r3') html = viewR3();
    else if (ph === 'r1_close') html = viewClosed(1);
    else if (ph === 'r2_close') html = viewClosed(2);
    else if (ph === 'r3_close') html = viewClosed(3);
    else if (ph === 'end') html = viewEnd();
  }
  if (html === '') return;
  const nickEl = document.getElementById('nick');
  if (nickEl) S.nickDraft = nickEl.value;
  $app.innerHTML = html;
  const n = document.getElementById('nick');
  if (n) { n.addEventListener('input', e => S.nickDraft = e.target.value); n.addEventListener('keydown', e => { if (e.key === 'Enter') act('join'); }); }
}

let lastPhase = null;
function onPhaseChange(ph) {
  if (ph !== lastPhase) { lastPhase = ph; window.scrollTo(0, 0); }
}

// ---------------- 이벤트 ----------------
function act(a, v) {
  const ui = S.ui;
  switch (a) {
    case 'join': {
      const nick = (document.getElementById('nick')?.value || '').trim().slice(0, 12);
      if (!nick) { S.error = '닉네임을 입력해 주세요.'; render(); return; }
      S.error = null;
      save({ nick, joinedAt: Date.now() });
      break;
    }
    case 'r1start': ui.r1.started = true; ui.r1.i = 0; ui.r1.step = 'type'; render(); scrollTo(0, 0); break;
    case 'r1type': {
      const c = R1_CARDS[ui.r1.i];
      ui.r1.step = 'strat';
      save({ r1: { answers: { [c.id]: { type: v } } } }); scrollTo(0, 0); break;
    }
    case 'r1back': ui.r1.step = 'type'; render(); break;
    case 'r1strat': {
      const c = R1_CARDS[ui.r1.i];
      ui.r1.i++; ui.r1.step = 'type';
      const last = ui.r1.i >= R1_CARDS.length;
      save({ r1: { answers: { [c.id]: { strat: v } }, ...(last ? { done: true } : {}) } }); scrollTo(0, 0); break;
    }
    case 'r2start': ui.r2.started = true; render(); scrollTo(0, 0); break;
    case 'r2pick': ui.r2.sel = ui.r2.sel === v ? null : v; render(); break;
    case 'r2drop': {
      if (!ui.r2.sel) return;
      const id = ui.r2.sel; ui.r2.sel = null;
      save({ r2: { place: { [id]: v } } }); break;
    }
    case 'r2unplace': {
      if (ui.r2.sel) { const g = S.me?.r2?.place?.[v]; const id = ui.r2.sel; ui.r2.sel = null; save({ r2: { place: { [id]: g } } }); break; }
      save({ r2: { place: { [v]: null } } }); break;
    }
    case 'r2next': ui.r2.step = 's2'; render(); scrollTo(0, 0); break;
    case 'r2refineg': {
      const q = R2_REFINE[ui.r2.q];
      ui.r2.sub = 'child';
      save({ r2: { refine: { [q.id + '_g']: v } } }); scrollTo(0, 0); break;
    }
    case 'r2back': ui.r2.sub = 'group'; save({ r2: { refine: { [R2_REFINE[ui.r2.q].id + '_g']: null } } }); break;
    case 'r2refine': {
      const q = R2_REFINE[ui.r2.q];
      save({ r2: { refine: { [q.id]: v } } }); scrollTo(0, 0); break;
    }
    case 'r2miss': {
      const m = ui.r2.miss; const i = m.indexOf(v);
      i >= 0 ? m.splice(i, 1) : m.push(v); render(); break;
    }
    case 'r2done': save({ r2: { missing: [...ui.r2.miss], done: true } }); scrollTo(0, 0); break;
    case 'r3start': ui.r3.started = true; render(); scrollTo(0, 0); break;
    case 'r3pick': ui.r3.sel = ui.r3.sel === v ? null : v; render(); break;
    case 'r3drop': {
      if (!ui.r3.sel) return;
      const id = ui.r3.sel; ui.r3.sel = null;
      save({ r3: { quad: { [id]: +v } } }); break;
    }
    case 'r3unplace': {
      if (ui.r3.sel) { const q = S.me?.r3?.quad?.[v]; const id = ui.r3.sel; ui.r3.sel = null; save({ r3: { quad: { [id]: q } } }); break; }
      save({ r3: { quad: { [v]: null } } }); break;
    }
    case 'r3done': save({ r3: { done: true } }); scrollTo(0, 0); break;
  }
}
$app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  e.preventDefault();
  act(t.dataset.act, t.dataset.v);
});

// ---------------- 시작 ----------------
async function boot() {
  S.session = undefined; render();
  const netEl = document.getElementById('net');
  onNet(ok => netEl.classList.toggle('hidden', ok));
  try { await store.init(); } catch (e) { $app.innerHTML = waitBox('⚠️', '연결할 수 없어요', '와이파이 연결을 확인하고 새로고침해 주세요.'); return; }
  store.subscribeSession(async (sess, err) => {
    if (err) { $app.innerHTML = waitBox('⚠️', '연결할 수 없어요', '와이파이 연결을 확인하고 새로고침해 주세요.'); return; }
    const newRun = sess?.runId && sess.runId !== S.runId;
    S.session = sess;
    if (newRun) {
      S.runId = sess.runId;
      const key = 'kimdaeri_pid_' + S.runId;
      S.pid = idStore.get(key);
      if (!S.pid) { S.pid = rid(); idStore.set(key, S.pid); }
      try { S.me = await store.getPlayer(S.runId, S.pid); } catch { S.me = null; }
      S.ui = { r1: { started: false, i: 0, step: 'type' }, r2: { started: false, step: 's1', i: 0, q: 0, sub: 'group', miss: [] }, r3: { started: false, sel: null } };
    }
    onPhaseChange(sess?.phase);
    render();
  });
}
boot();
