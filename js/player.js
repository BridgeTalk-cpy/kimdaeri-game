import { store, saveWithRetry, onNet, safeLS } from './store.js';
import {
  KIM, TYPES, STRATEGIES, R1_CARDS, R2_MISSION, R2_GROUPS, R2_PIECES, R2_REFINE, R2_MISSING,
  R3_INTRO, R3_CARDS, R3_BUDGET, R3_EMERGENCY, QUADS, FINAL,
  scoreR1, scoreR2, quadTotals, costOf,
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
  ui: { r1: { started: false, i: 0, step: 'type' }, r2: { started: false, step: 's1', i: 0, q: 0, miss: [] }, r3: { started: false, step: 'plan', plan: [], defer: [] } },
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
    body += `<div class="q">Q2. 어떻게 처리하는 게 좋을까요?</div><div class="opts">` +
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
  const nextPiece = R2_PIECES.findIndex(p => !place[p.id]);
  if (ui.step === 's1' && nextPiece === -1) ui.step = 's2';
  if (ui.step === 's1') ui.i = nextPiece;
  const refine = r2.refine || {};
  if (ui.step === 's2') {
    const nq = R2_REFINE.findIndex(q => !refine[q.id]);
    if (nq === -1) ui.step = 's3'; else ui.q = nq;
  }

  if (ui.step === 's1') {
    const p = R2_PIECES[ui.i];
    return top('ROUND 2 · STEP 1 작업 배치하기') + `<div class="progress"><i style="width:${(ui.i / R2_PIECES.length) * 100}%"></i></div>
      <div class="task"><div class="no">작업 조각 ${ui.i + 1} / ${R2_PIECES.length}</div><div class="tt">${esc(p.title)}${p.dept ? `<span class="dept">${esc(p.dept)}</span>` : ''}</div></div>
      <div class="q">이 작업은 어느 묶음에 들어갈까요?</div><div class="opts two">` +
      R2_GROUPS.map(g => `<button class="opt two" data-act="r2place" data-v="${g.id}">${g.label}</button>`).join('') + `</div>`;
  }
  if (ui.step === 's2') {
    const q = R2_REFINE[ui.q];
    return top('ROUND 2 · STEP 2 더 구체화하기') + `<div class="progress"><i style="width:${(ui.q / R2_REFINE.length) * 100}%"></i></div>
      <div class="task"><div class="no">너무 큰 업무 ${ui.q + 1} / ${R2_REFINE.length}</div><div class="tt">${esc(q.big)}</div></div>
      <div class="q">다음 중 큰 업무를 구성하는 구체적인 세부 작업으로 가장 적절한 것은?</div><div class="opts">` +
      q.options.map(o => `<button class="opt" data-act="r2refine" data-v="${o.id}"><b>${esc(o.text)}</b></button>`).join('') + `</div>`;
  }
  // s3
  return top('ROUND 2 · STEP 3 빠진 작업 찾기') +
    `<div class="box"><p style="margin:0;font-weight:700;font-size:17px">이대로 출시하면 문제가 생깁니다.<br>빠진 작업을 모두 골라 주세요.</p><p class="note">여러 개 선택할 수 있어요.</p></div>
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
function cells(used, emergency) {
  let html = '<div class="cells">';
  const em = emergency || 0;
  for (let i = 0; i < R3_BUDGET; i++) {
    let cls = '';
    if (i < em) cls = 'em';
    else if (i < em + used) cls = 'on';
    html += `<i class="${cls}"></i>`;
  }
  return html + '</div>';
}
function r3Card(c, sel, off, act) {
  const cls = sel ? (act === 'r3defer' ? 'defer' : 'sel') : '';
  return `<button class="r3row ${cls} ${off ? 'off' : ''}" data-act="${act}" data-v="${c.id}">
    <div class="cost">${c.cost}<small>칸</small></div>
    <div class="bd"><b>${esc(c.title)}</b><span>⏰ 마감: ${esc(c.due)}</span><span>⚠️ 안 하면: ${esc(c.risk)}</span></div></button>`;
}

function viewR3() {
  const r3 = S.me?.r3 || {};
  const ui = S.ui.r3;
  if (r3.done) return viewR3Result(true);
  if (!ui.started && !r3.plan) {
    return top('ROUND 3 · 순서 정하기') + `<h1 class="p-title">김대리의 이번 주를 계획하라!</h1>
      <div class="box"><p>월요일 아침, 김대리의 이번 주 업무가 쌓여 있습니다.</p>
      <p style="font-weight:700">${esc(R3_INTRO.time)}</p><p class="note" style="margin:0">${esc(R3_INTRO.note)}</p>
      <div class="crit"><b>김대리의 평가 기준</b><br>${esc(R3_INTRO.criteria)}</div></div>
      <div class="mission"><b>MISSION</b><br>10칸 안에 이번 주에 할 업무를 골라 주세요. 다 넣을 수는 없습니다.</div>` +
      sticky(`<button class="btn" data-act="r3start">시작하기</button>`);
  }
  ui.started = true;
  if (r3.plan && ui.step === 'plan') { ui.step = 'defer'; ui.plan = r3.plan; }

  if (ui.step === 'plan') {
    const used = costOf(ui.plan);
    return top('ROUND 3 · 이번 주 계획') +
      `<div class="meter">${cells(used)}<div class="lbl"><span>사용 ${used} / ${R3_BUDGET}칸</span><span style="color:${used === R3_BUDGET ? 'var(--ok)' : 'var(--muted)'}">${used === R3_BUDGET ? '완성!' : `${R3_BUDGET - used}칸 남음`}</span></div></div>` +
      R3_CARDS.map(c => {
        const sel = ui.plan.includes(c.id);
        const off = !sel && used + c.cost > R3_BUDGET;
        return r3Card(c, sel, off, 'r3pick');
      }).join('') +
      sticky(`<button class="btn" data-act="r3plan" ${used === R3_BUDGET ? '' : 'disabled'}>${used === R3_BUDGET ? '이 계획으로 확정하기' : `10칸을 채워 주세요 (${used}/10)`}</button>`);
  }
  // defer
  const plan = ui.plan;
  const deferCost = costOf(ui.defer);
  const remain = costOf(plan) - deferCost;
  return top('ROUND 3 · 돌발 상황') +
    `<div class="alarm"><h3>🔔 ${esc(R3_EMERGENCY.when)}</h3><p style="margin:0 0 6px">${esc(R3_EMERGENCY.text)} <b>(${R3_EMERGENCY.cost}칸)</b></p>
     <p style="margin:0;font-weight:800">${esc(R3_EMERGENCY.ask)}</p></div>
     <div class="meter">${cells(remain, R3_EMERGENCY.cost)}<div class="lbl"><span>🔴 긴급 ${R3_EMERGENCY.cost}칸 + 남은 계획 ${remain}칸 = ${remain + R3_EMERGENCY.cost}/${R3_BUDGET}칸</span><span style="color:${deferCost === R3_EMERGENCY.cost ? 'var(--ok)' : 'var(--bad)'}">${deferCost === R3_EMERGENCY.cost ? '완성!' : `${R3_EMERGENCY.cost - deferCost}칸 초과`}</span></div></div>
     <p class="note" style="margin-top:0">다음 주로 미룰 업무를 눌러 주세요.</p>` +
    R3_CARDS.filter(c => plan.includes(c.id)).map(c => {
      const sel = ui.defer.includes(c.id);
      const off = !sel && deferCost + c.cost > R3_EMERGENCY.cost;
      return r3Card(c, sel, off, 'r3defer');
    }).join('') +
    sticky(`<button class="btn" data-act="r3done" ${deferCost === R3_EMERGENCY.cost ? '' : 'disabled'}>이 업무들을 다음 주로 미루기</button>`);
}

function qbarHTML(t) {
  const sum = Object.values(t).reduce((a, b) => a + b, 0) || 1;
  return `<div class="qbar">` + [1, 2, 3, 4].filter(k => t[k]).map(k => `<span class="${QUADS[k].cls}bg" style="width:${(t[k] / sum) * 100}%">${t[k]}칸</span>`).join('') + `</div>`;
}

function viewR3Result(waiting) {
  const r3 = S.me?.r3 || {};
  const before = quadTotals(r3.plan);
  const after = quadTotals((r3.plan || []).filter(id => !(r3.defer || []).includes(id)), true);
  const lost2 = before[2] - after[2];
  const fbs = (r3.defer || []).map(id => R3_CARDS.find(c => c.id === id)).filter(Boolean);
  const dropped = R3_CARDS.filter(c => !(r3.plan || []).includes(c.id));
  return top('ROUND 3 · 결과') + `<h1 class="p-title">김대리의 이번 주 10칸</h1>
    <div class="box"><b>계획했을 때</b>${qbarHTML(before)}<div style="height:10px"></div><b>돌발 후 조정했을 때</b>${qbarHTML(after)}
    <div class="legend">${[1, 2, 3, 4].map(k => `<span>${QUADS[k].dot} ${QUADS[k].short}</span>`).join('')}</div></div>
    ${lost2 > 0 ? `<div class="box"><p style="font-weight:700;margin:0">급한 일이 들어오자 <b>중요하지만 급하지 않은 일</b>이 ${lost2}칸 줄었어요. 무엇을 지키셨나요?</p></div>` : ''}
    <div class="box"><h3>내가 미룬 업무</h3>${fbs.map(c => `<div class="fb"><b>${esc(c.title)}</b><br>${esc(c.fb)}</div>`).join('')}
    ${dropped.length ? `<p class="note">처음 계획에서 뺀 업무: ${dropped.map(c => esc(c.title)).join(', ')}</p>` : ''}</div>` +
    (waiting ? waitBox('👀', '다른 분들을 기다리는 중<span class="dots"></span>', '모두 끝나면 강사님이 결과를 공개합니다.') : '');
}

// ---------------- 마감/마무리 ----------------
function viewClosed(n) {
  const done = S.me?.[`r${n}`]?.done;
  const res = n === 1 ? viewR1Result(false) : n === 2 ? viewR2Result(false) : viewR3Result(false);
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
    case 'r2place': {
      const p = R2_PIECES[ui.r2.i];
      save({ r2: { place: { [p.id]: v } } }); scrollTo(0, 0); break;
    }
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
    case 'r3pick': {
      const p = ui.r3.plan; const i = p.indexOf(v);
      if (i >= 0) p.splice(i, 1);
      else if (costOf(p) + (R3_CARDS.find(c => c.id === v)?.cost || 0) <= R3_BUDGET) p.push(v);
      render(); break;
    }
    case 'r3plan': ui.r3.step = 'defer'; save({ r3: { plan: [...ui.r3.plan] } }); scrollTo(0, 0); break;
    case 'r3defer': {
      const d = ui.r3.defer; const i = d.indexOf(v);
      if (i >= 0) d.splice(i, 1);
      else if (costOf(d) + (R3_CARDS.find(c => c.id === v)?.cost || 0) <= R3_EMERGENCY.cost) d.push(v);
      render(); break;
    }
    case 'r3done': save({ r3: { defer: [...ui.r3.defer], done: true } }); scrollTo(0, 0); break;
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
      S.ui = { r1: { started: false, i: 0, step: 'type' }, r2: { started: false, step: 's1', i: 0, q: 0, miss: [] }, r3: { started: false, step: 'plan', plan: [], defer: [] } };
      if (S.me?.r3?.plan) { S.ui.r3.plan = [...S.me.r3.plan]; }
    }
    onPhaseChange(sess?.phase);
    render();
  });
}
boot();
