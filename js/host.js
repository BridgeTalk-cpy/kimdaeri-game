import { store } from './store.js';
import { HOST_PIN, WIFI, COURSE_TITLE } from './config.js';
import {
  PHASES, TYPES, STRATEGIES, R1_CARDS, R2_GROUPS, R2_PIECES, R2_REFINE, R2_MISSING,
  R3_CARDS, R3_EMERGENCY, QUADS, FINAL, scoreR1, scoreR2, quadTotals,
} from './content.js';

const $ = document.getElementById('host');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

const H = {
  authed: false, session: null, players: [], fake: [], useFake: false,
  tab: 'live', scene: { r1: 0, r2: 0, r3: 0 }, flipped: new Set(), resetArm: false, unsub: null,
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
    const removeW = { t9: 5, t4: 3, t7: 4, t8: 2, t6: 2, t5: 1, t3: 0.5, t1: 0.2, t2: 0.2 };
    let plan = R3_CARDS.map(c => c.id);
    let need = 2;
    while (need > 0) {
      const cand = plan.filter(id => R3_CARDS.find(c => c.id === id).cost <= need).map(id => [id, removeW[id] || 1]);
      const id = pickW(r, cand); plan = plan.filter(x => x !== id); need -= R3_CARDS.find(c => c.id === id).cost;
    }
    const deferW = { t7: 5, t8: 3, t6: 3, t5: 2, t9: 4, t4: 4, t3: 1, t1: 0.3, t2: 0.3 };
    let defer = []; need = 2;
    while (need > 0) {
      const cand = plan.filter(id => !defer.includes(id) && R3_CARDS.find(c => c.id === id).cost <= need).map(id => [id, deferW[id] || 1]);
      if (!cand.length) break;
      const id = pickW(r, cand); defer.push(id); need -= R3_CARDS.find(c => c.id === id).cost;
    }
    out.push({ id: 'fake' + k, fake: true, nick: '가상' + (k + 1), r1: { answers, done: true }, r2: { place, refine, missing, done: true }, r3: { plan, defer, done: true } });
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
  const N = ps.length;
  const names = ['아는 것과 하는 것', '함정 보기', '논쟁 카드 6번', '카드별 전체', '업무 4유형 정의', '4가지 처리 전략'];
  const s = H.scene.r1;
  let body = '';
  if (!N && s < 4) body = `<div class="s-sub">아직 응답이 없습니다.</div>`;
  else if (s === 0) {
    let t = 0, st = 0, cnt = 0;
    for (const p of ps) { const sc = scoreR1(p.r1); const answered = Object.values(p.r1.answers).filter(a => a.strat).length; if (!answered) continue; t += sc.type; st += sc.strat; cnt += answered; }
    body = `<div class="s-title">아는 것과 하는 것의 차이</div><div class="s-sub">응답 ${N}명 평균</div>
      <div class="big2"><div><b>${pct(t, cnt)}%</b><span>유형 분류 정답률</span></div><div><b>${pct(st, cnt)}%</b><span>처리 전략 정답률</span></div></div>
      ${say('업무는 잘 나누는데, 처리는 다르게 하고 있죠.')}`;
  } else if (s === 1) {
    const rows = R1_CARDS.map(c => {
      const g = ps.filter(p => p.r1.answers[c.id]?.strat === 'gap').length;
      const sp = ps.filter(p => p.r1.answers[c.id]?.strat === 'spare').length;
      const tot = ps.filter(p => p.r1.answers[c.id]?.strat).length;
      return { c, g, sp, tot, sum: g + sp };
    }).sort((a, b) => pct(b.sum, b.tot) - pct(a.sum, a.tot));
    body = `<div class="s-title">함정 보기를 고른 비율</div><div class="s-sub">'틈틈이 하기' 또는 '여유 있을 때 하기'를 고른 비율 (높은 순)</div>
      <div class="bars">${rows.map((r, i) => bar(`${esc(r.c.title)}`, r.sum, r.tot, i < 2 ? 'trap' : '')).join('')}</div>
      <div class="grid-cards" style="margin-top:20px"><div class="say" style="margin:0">💬 <b>틈틈이 하기</b> → 핵심업무는 계속 끊기고, 프로젝트는 점검 없이 흘러갑니다.</div>
      <div class="say" style="margin:0">💬 <b>여유 있을 때 하기</b> → 여유는 오지 않습니다. 미래준비성 업무는 늘 뒤로 밀려요.</div></div>`;
  } else if (s === 2) {
    const c = R1_CARDS.find(c => c.id === 'c6');
    const a = ps.map(p => p.r1.answers.c6).filter(x => x?.type);
    const coreP = a.filter(x => x.type === 'core');
    const coreSplit = coreP.filter(x => x.strat === 'split').length;
    body = `<div class="s-title">카드 6. ${esc(c.title)}</div><div class="s-sub">${esc(c.text)}</div>
      <div class="bars">${TYPES.map(t => bar(t.label, a.filter(x => x.type === t.id).length, a.length, c.type.includes(t.id) ? 'ok' : '')).join('')}</div>
      ${say('핵심업무를 고른 분도, 프로젝트성 업무를 고른 분도 계시네요. 어떤 기준으로 판단하셨어요?')}
      <div class="say" style="background:#eef3f9;border-color:var(--navy)">📊 핵심업무를 고른 분 중 <b>${pct(coreSplit, coreP.length)}%</b>도 처리 전략은 <b>'쪼개서 관리하기'</b>를 고르셨습니다.</div>
      <div class="say">얼마나 중요한가와 어떻게 관리해야 하는가는 <b>다른 기준</b>입니다.</div>`;
  } else if (s === 3) {
    body = `<div class="s-title">카드별 응답 전체</div><div class="s-sub">초록색이 의도한 답</div><div class="grid-cards">` +
      R1_CARDS.map((c, i) => {
        const a = ps.map(p => p.r1.answers[c.id]).filter(Boolean);
        const at = a.filter(x => x.type).length, as = a.filter(x => x.strat).length;
        return `<div class="mini"><h4>${i + 1}. ${esc(c.title)}${c.debate ? ' ⚡' : ''}</h4>
          ${TYPES.map(t => bar(t.label, a.filter(x => x.type === t.id).length, at, c.type.includes(t.id) ? 'ok' : '')).join('')}
          <div style="height:8px"></div>
          ${STRATEGIES.map(st => bar(st.label, a.filter(x => x.strat === st.id).length, as, st.id === c.strat ? 'ok' : st.trap ? 'trap' : '')).join('')}</div>`;
      }).join('') + `</div>`;
  } else if (s === 4) {
    body = `<div class="s-title">업무 4유형의 정의와 구분 순서</div><div class="s-sub">위에서부터 차례로 질문합니다</div>
      <table class="tbl"><tr><th>순서</th><th>구분하는 질문</th><th>예 →</th></tr>
      <tr><td>①</td><td>정해진 결과물을 완성하면 종료되는 업무인가?</td><td><b>프로젝트성 업무</b></td></tr>
      <tr><td>②</td><td>당장의 성과보다 미래를 위해 미리 투자하는 업무인가?</td><td><b>미래준비성 업무</b></td></tr>
      <tr><td>③</td><td>내 직무에서 반복적으로 책임지고 수행하는 주요 업무인가?</td><td><b>핵심업무</b></td></tr>
      <tr><td>④</td><td>주요 성과를 뒷받침하는 지원 업무인가?</td><td><b>보조업무</b></td></tr></table>
      ${say('"끝이 있는가?"를 먼저 묻습니다. 끝이 있는 일은 중요도와 상관없이 쪼개서 관리해야 하니까요.')}`;
  } else if (s === 5) {
    body = `<div class="s-title">4가지 업무처리 전략</div><div class="s-sub">유형에 따라 처리 방법이 다릅니다</div>
      <table class="tbl"><tr><th>유형</th><th>전략</th><th>한 줄 설명</th></tr>
      ${STRATEGIES.filter(s => !s.trap).map(s => `<tr><td>${TYPES.find(t => t.id === s.type).label}</td><td><b>${s.label}</b></td><td>${s.desc}</td></tr>`).join('')}</table>
      ${say('보조업무는 묶어서 처리합니다. 단, <b>2분 안에 끝나는 일</b>과 <b>고객 피해가 걸린 긴급 건</b>은 바로 처리하세요.')}
      <div class="say" style="font-size:28px;text-align:center;background:var(--navy);color:#fff;border:0">핵심은 집중하고, 보조는 묶고, 프로젝트는 쪼개고, 미래는 고정 시간을 확보한다.</div>`;
  }
  return sceneNav('r1', names) + body;
}

// ---------------- ROUND 2 결과 ----------------
function viewR2() {
  const ps = all().filter(p => p.r2);
  const names = ['너무 큰 작업', '빠진 작업 찾기', '작업 배치 전체', 'WBS 원칙'];
  const s = H.scene.r2;
  let body = '';
  if (!ps.length && s < 3) body = `<div class="s-sub">아직 응답이 없습니다.</div>`;
  else if (s === 0) {
    const traps = R2_PIECES.filter(p => p.trap);
    body = `<div class="s-title">'아직 너무 크다'를 알아챈 비율</div><div class="s-sub">STEP 1에서 함정 카드를 '아직 너무 크다'로 고른 비율</div>
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
    body = `<div class="s-title">작업 배치 전체</div><div class="s-sub">초록색이 의도한 묶음</div><div class="grid-cards">` +
      R2_PIECES.map(p => {
        const a = ps.filter(x => x.r2.place?.[p.id]);
        return `<div class="mini"><h4>${esc(p.title)}${p.dept ? ` <span class="dept">${esc(p.dept)}</span>` : ''}${p.debate ? ' ⚡' : ''}${p.trap ? ' 🪤' : ''}</h4>
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
function viewR3() {
  const ps = all().filter(p => p.r3?.plan);
  const N = ps.length;
  const names = ['매트릭스', "'오늘 중으로'", '가장 많이 미룬 업무', '계획 vs 조정', '판단 기준과 처리 방법', '전체 마무리'];
  const s = H.scene.r3;
  let body = '';
  const inPlan = (id) => ps.filter(p => p.r3.plan.includes(id)).length;
  if (!N && s < 4) body = `<div class="s-sub">아직 응답이 없습니다.</div>`;
  else if (s === 0) {
    const quad = (q) => `<div class="quad ${QUADS[q].cls}"><h4>${q}. ${QUADS[q].label}</h4>${R3_CARDS.filter(c => c.q === q).map(c => `<div class="chip ${c.id === 't8' ? 'hl' : ''}"><span>${esc(c.title)}</span><b>${pct(inPlan(c.id), N)}%</b></div>`).join('')}
      ${q === 1 ? `<div class="chip" style="background:#fff0f0"><span>🔔 돌발: 긴급 차단 기준 업데이트</span><b>+${R3_EMERGENCY.cost}칸</b></div>` : ''}</div>`;
    body = `<div class="s-title">아이젠하워 매트릭스</div><div class="s-sub">숫자 = 처음 계획에 넣은 비율 (응답 ${N}명)</div>
      <div class="matrix"><div></div><div class="ax">급하다</div><div class="ax">덜 급하다</div>
      <div class="ax v">중요하다</div>${quad(1)}${quad(2)}<div class="ax v">덜 중요하다</div>${quad(3)}${quad(4)}</div>`;
  } else if (s === 1) {
    body = `<div class="s-title">'오늘 중으로' 요청한 데이터 추출</div><div class="s-sub">실제 활용은 다음 주, 마감 협의 가능</div>
      <div class="big2"><div><b>${pct(inPlan('t8'), N)}%</b><span>이번 주 계획에 넣음</span></div><div><b>${pct(inPlan('t5'), N)}%</b><span>'개선 범위 확정'을 넣음</span></div></div>
      ${say("'오늘 중으로' 요청한 데이터 추출, 몇 분이나 넣으셨나요? 실제 활용은 언제였죠? <b>다음 주였습니다.</b>")}`;
  } else if (s === 2) {
    const d = ps.filter(p => p.r3.defer);
    const rows = R3_CARDS.map(c => ({ c, n: d.filter(p => p.r3.defer.includes(c.id)).length })).sort((a, b) => b.n - a.n).slice(0, 3);
    const top2 = rows.filter(r => r.c.q === 2).length;
    body = `<div class="s-title">돌발 상황 후 가장 많이 미룬 업무</div><div class="s-sub">응답 ${d.length}명</div>
      <div class="top3">${rows.map((r, i) => `<div class="it"><span class="rk">${i + 1}</span><span>${QUADS[r.c.q].dot} ${esc(r.c.title)}</span><span class="pc">${pct(r.n, d.length)}%</span></div>`).join('')}</div>
      ${top2 ? say('급한 일이 생기면 가장 먼저 사라지는 게 <b>중요하지만 급하지 않은 일</b>입니다. 그중에서 무엇을 지키셨나요?') : say('왜 이 업무를 미루셨나요? 어떤 기준으로 판단하셨어요?')}`;
  } else if (s === 3) {
    const d = ps.filter(p => p.r3.defer);
    const avg = (fn) => { const t = { 1: 0, 2: 0, 3: 0, 4: 0 }; for (const p of d) { const x = fn(p); for (const k in t) t[k] += x[k]; } for (const k in t) t[k] = d.length ? Math.round((t[k] / d.length) * 10) / 10 : 0; return t; };
    const b = avg(p => quadTotals(p.r3.plan)), a = avg(p => quadTotals(p.r3.plan.filter(id => !p.r3.defer.includes(id)), true));
    const qb = (t) => `<div class="qbar">${[1, 2, 3, 4].filter(k => t[k]).map(k => `<span class="${QUADS[k].cls}bg" style="width:${t[k] * 10}%">${QUADS[k].dot} ${t[k]}칸</span>`).join('')}</div>`;
    body = `<div class="s-title">계획 vs 돌발 후 조정</div><div class="s-sub">응답 ${d.length}명 평균, 10칸의 사용처</div>
      <div class="compare"><div class="row"><span>계획했을 때</span>${qb(b)}</div><div class="row"><span>돌발 후 조정</span>${qb(a)}</div></div>
      <div class="legend" style="font-size:16px;margin-top:10px">${[1, 2, 3, 4].map(k => `<span>${QUADS[k].dot} ${QUADS[k].short}</span>`).join('')}</div>
      ${say(`중요하지만 급하지 않은 일: 평균 <b>${b[2]}칸 → ${a[2]}칸</b>`)}
      ${say('ROUND 1에서 미래준비성 업무를 \'여유 있을 때 하기\'로 고르신 분들, 이번 주에 그 여유가 있었나요?')}`;
  } else if (s === 4) {
    body = `<div class="s-title">두 가지 판단 기준</div>
      <table class="tbl"><tr><td><b>긴급성</b></td><td>실제로 언제까지 완료해야 하는가?</td></tr><tr><td><b>중요도</b></td><td>완료하지 않으면 나와 동료, 조직에 어떤 영향이 있는가?</td></tr></table>
      <div style="height:16px"></div>
      <table class="tbl"><tr><th>사분면</th><th>처리 방법</th><th>김대리 예시</th></tr>
      <tr><td>🔴 1. 중요·긴급</td><td><b>바로 처리한다</b></td><td>지표 보고, 정기 피싱 점검, 고객 문의, 돌발 대응</td></tr>
      <tr><td>🟢 2. 중요·덜 긴급</td><td><b>일정에 먼저 넣는다</b></td><td>개선 범위 확정, 응대 자료, 자동화 도구, 데이터 요청(마감 협의 후)</td></tr>
      <tr><td>🟡 3. 긴급·덜 중요</td><td><b>빠르게 처리하거나 줄인다</b></td><td>비품 신청 취합</td></tr>
      <tr><td>⚪ 4. 둘 다 아님</td><td><b>줄이거나 뺀다</b></td><td>폴더 정리</td></tr></table>
      ${say("업무 유형은 <b>어떻게 처리할지</b>를, 사분면은 <b>무엇부터 할지</b>를 정합니다. '오늘 중으로'를 들으면 먼저 <b>실제 마감</b>을 물어보세요.")}`;
  } else if (s === 5) {
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
  head.push('R2 빠진작업 선택', 'R2 빠진작업 찾은 수', 'R3 계획', 'R3 미룬 업무');
  const tl = (id) => TYPES.find(t => t.id === id)?.label || '';
  const sl = (id) => STRATEGIES.find(t => t.id === id)?.label || '';
  const gl = (id) => R2_GROUPS.find(t => t.id === id)?.label || '';
  const ct = (id) => R3_CARDS.find(c => c.id === id)?.title || '';
  const rows = ps.map(p => {
    const r = [p.nick || ''];
    R1_CARDS.forEach(c => { const a = p.r1?.answers?.[c.id] || {}; r.push(tl(a.type), sl(a.strat)); });
    const s1 = scoreR1(p.r1); r.push(s1.type, s1.strat);
    R2_PIECES.forEach(x => r.push(gl(p.r2?.place?.[x.id])));
    R2_REFINE.forEach(q => r.push(q.options.find(o => o.id === p.r2?.refine?.[q.id])?.text || ''));
    r.push((p.r2?.missing || []).map(id => R2_MISSING.find(m => m.id === id)?.text).join(' / '), scoreR2(p.r2).found);
    r.push((p.r3?.plan || []).map(ct).join(' / '), (p.r3?.defer || []).map(ct).join(' / '));
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
      if (v.endsWith('_close')) { H.tab = 'r' + v[1]; H.scene['r' + v[1]] = 0; }
      else if (v === 'end') H.tab = 'end';
      else H.tab = 'live';
      break;
    }
    case 'tab': H.tab = v; break;
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
      H.tab = 'live'; H.flipped.clear(); H.scene = { r1: 0, r2: 0, r3: 0 };
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
