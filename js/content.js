// =============================================================
//  「김대리의 한 달」 게임 콘텐츠
//  문구를 바꾸려면 이 파일만 수정하면 됩니다.
// =============================================================

export const PHASES = [
  { id: 'lobby',    label: '대기실' },
  { id: 'r1',       label: 'R1 진행' },
  { id: 'r1_close', label: 'R1 마감·설명' },
  { id: 'r2',       label: 'R2 진행' },
  { id: 'r2_close', label: 'R2 마감·설명' },
  { id: 'r3',       label: 'R3 진행' },
  { id: 'r3_close', label: 'R3 마감·설명' },
  { id: 'end',      label: '마무리' },
];

export const KIM = {
  name: '김대리',
  team: '서비스운영팀 · 5년 차',
  intro: "'스마트피싱보호' 서비스가 안정적으로 운영되도록 관리하고, 매달 성과를 보고합니다. 개발팀, 고객센터, 마케팅팀과 매일 협업하며, 최근 앱 개선 프로젝트까지 맡아 할 일이 크게 늘었습니다.",
  criteria: '서비스 안정성 · 고객 만족도 · 월간 이용 지표',
};

// ---------------- ROUND 1 ----------------
export const TYPES = [
  { id: 'core',    label: '핵심업무' },
  { id: 'support', label: '보조업무' },
  { id: 'project', label: '프로젝트성 업무' },
  { id: 'future',  label: '미래준비성 업무' },
];

export const STRATEGIES = [
  { id: 'focus', label: '집중하기',         desc: '방해받지 않는 시간에 한 번에 끝낸다', type: 'core' },
  { id: 'batch', label: '묶어서 처리하기',   desc: '비슷한 일은 정해진 시간에 한꺼번에 한다', type: 'support' },
  { id: 'split', label: '쪼개서 관리하기',   desc: '큰 일은 작은 단계로 나누고 중간 점검한다', type: 'project' },
  { id: 'fixed', label: '고정 시간 확보하기', desc: '매주 같은 시간을 정해 꾸준히 한다', type: 'future' },
  { id: 'gap',   label: '틈틈이 하기',       desc: '다른 일 사이사이, 짬이 날 때마다 조금씩 한다', trap: true },
  { id: 'spare', label: '여유 있을 때 하기',  desc: '급한 일을 먼저 끝내고 남는 시간에 한다', trap: true },
];

export const R1_CARDS = [
  { id: 'c1', title: '월간 이용 지표 보고', text: '매달 5일 팀장에게 보고하며, 평가에 바로 반영된다.', type: ['core'], strat: 'focus' },
  { id: 'c2', title: '신규 피싱 패턴 분석', text: '매주 새 피싱 유형을 분석해 차단 기준을 업데이트한다. 놓치면 서비스 안정성에 문제가 생긴다.', type: ['core'], strat: 'focus' },
  { id: 'c3', title: '고객센터 문의 답변', text: '고객센터가 전달하는 문의에 하루 평균 20건 답변한다. 대부분 정형화된 문의다.', type: ['support'], strat: 'batch', debate: true },
  { id: 'c4', title: '주간 회의록 정리·공유', text: '매주 월요일 부서 회의 후 정리해 공유한다.', type: ['support'], strat: 'batch' },
  { id: 'c5', title: 'FAQ 전면 개편', text: '반복 문의를 분석해 12월 15일까지 FAQ를 개편한다.', type: ['project'], strat: 'split' },
  { id: 'c6', title: '앱 개선 프로젝트', text: '12월 말 출시 예정이며, 올해 핵심 목표다. 개발팀, 마케팅팀과 함께 진행한다.', type: ['project', 'core'], strat: 'split', debate: true },
  { id: 'c7', title: '데이터 자동화 도구 익히기', text: '익혀 두면 보고서 작성 시간이 크게 줄어든다. 정해진 기한은 없다.', type: ['future'], strat: 'fixed' },
  { id: 'c8', title: '보안 서비스 트렌드 파악하기', text: '국내외 보안 서비스의 새로운 기능과 동향을 파악하며 우리 서비스 개선 아이디어를 모은다. 정해진 기한은 없다.', type: ['future'], strat: 'fixed' },
];

// ---------------- ROUND 2 ----------------
export const R2_MISSION = {
  boss: '"김대리, 앱 개선 프로젝트 12월 말 출시 맞지? 다음 주 월요일까지 해야 할 작업 전체를 정리해 줘요. 출시 후 초기 안정화까지가 이번 프로젝트 범위예요."',
  situation: '현재 기능 테스트에서 일부 오류가 발견되어, 개발팀이 수정 작업을 진행하고 있습니다.',
  plan: '김대리는 작업을 기획 / 개발·검증 / 출시 준비 세 묶음으로 정리하기로 했습니다.',
};

export const R2_GROUPS = [
  { id: 'plan',    label: '기획' },
  { id: 'dev',     label: '개발·검증' },
  { id: 'launch',  label: '출시 준비' },
  { id: 'big',     label: '아직 너무 크다' },
];

export const R2_PIECES = [
  { id: 'p1',  title: '고객 불편사항 분석', ans: ['plan'] },
  { id: 'p2',  title: '개선 범위 확정', ans: ['plan'] },
  { id: 'p3',  title: '화면 설계안 작성', ans: ['plan'] },
  { id: 'p4',  title: '테스트 시나리오 작성', ans: ['dev', 'plan'], debate: true },
  { id: 'p5',  title: '기능 개발 요청 및 개발 일정 협의', ans: ['dev'] },
  { id: 'p6',  title: '기능 개발', dept: '개발팀', ans: ['dev'] },
  { id: 'p7',  title: '오류 테스트', ans: ['dev'] },
  { id: 'p8',  title: '고객 안내문 작성', dept: '마케팅팀', ans: ['launch'] },
  { id: 'p9',  title: '앱스토어 업데이트 등록', ans: ['launch'] },
  { id: 'p10', title: '앱 완성도 높이기', ans: ['big'], trap: true },
  { id: 'p11', title: '출시 준비 마무리하기', ans: ['big'], trap: true },
];

export const R2_REFINE = [
  {
    id: 'q1', big: '앱 완성도 높이기',
    options: [
      { id: 'a', text: '앱 사용성 개선하기' },
      { id: 'b', text: '사용자 불편사항 TOP5 개선안 작성하기', correct: true },
      { id: 'c', text: '앱 전반 품질 점검하기' },
      { id: 'd', text: '디자인 개선 방향 논의하기' },
    ],
  },
  {
    id: 'q2', big: '출시 준비 마무리하기',
    options: [
      { id: 'a', text: '출시 관련 업무 정리하기' },
      { id: 'b', text: '출시 준비 상황 공유하기' },
      { id: 'c', text: '출시 전 점검표 10개 항목 최종 확인하기', correct: true },
      { id: 'd', text: '출시 일정에 맞추기' },
    ],
  },
];

export const R2_MISSING = [
  { id: 'm1', text: '고객센터 응대 자료 준비', correct: true, tag: '🏢 다른 부서의 일' },
  { id: 'm2', text: '출시 후 초기 고객 반응 점검', correct: true, tag: '⏭️ 끝난 다음의 일' },
  { id: 'm3', text: '오류 수정 결과 재검증', correct: true, tag: '🔁 중간 확인 작업' },
  { id: 'm4', text: '화면 설계안 작성', correct: false, tag: '이미 있음' },
  { id: 'm5', text: '개발팀과 회의 자주 하기', correct: false, tag: '완료 기준이 없음' },
];

// ---------------- ROUND 3 ----------------
export const R3_INTRO = {
  time: '이번 주 시간: 10칸 (1칸 = 약 4시간, 반나절)',
  note: '10칸은 김대리가 이번 주에 계획할 수 있는 시간 전체입니다. 매일 하는 업무는 일주일 소요시간을 합쳐 계산했습니다.',
  criteria: '서비스 안정성 · 고객 만족도 · 월간 이용 지표 · 앱 개선 프로젝트 성공',
};

export const QUADS = {
  1: { label: '중요·긴급',            short: '중요하고 급한 일',     dot: '🔴', cls: 'q1', how: '바로 처리한다' },
  2: { label: '중요·덜 긴급',          short: '중요하지만 덜 급한 일', dot: '🟢', cls: 'q2', how: '일정에 먼저 넣는다' },
  3: { label: '긴급·덜 중요',          short: '급하지만 덜 중요한 일', dot: '🟡', cls: 'q3', how: '빠르게 처리하거나 줄인다' },
  4: { label: '중요하지도 급하지도 않음', short: '둘 다 아닌 일',        dot: '⚪', cls: 'q4', how: '줄이거나 뺀다' },
};

export const R3_CARDS = [
  { id: 't1', title: '월간 이용 지표 보고', cost: 2, due: '이번 주 금요일', risk: '팀장 보고 누락, 평가에 반영', q: 1,
    fb: '팀장 보고가 누락되고 평가에 반영돼요. 정말 미뤄도 될까요?' },
  { id: 't2', title: '정기 피싱 패턴 분석 및 차단 기준 점검', cost: 2, due: '이번 주 목요일', risk: '새 피싱 문자 차단 누락 위험', q: 1,
    fb: '정기 점검이 빠지면 새 피싱 문자를 놓칠 수 있어요.' },
  { id: 't3', title: '고객 문의 답변 (하루 2번 묶어서)', cost: 1, due: '매일', risk: '고객 불만 증가', q: 1,
    fb: '고객 만족도도 평가 기준이에요. 매일 쌓이는 문의는 괜찮을까요?' },
  { id: 't4', title: '팀 비품 신청 취합', cost: 1, due: '내일 (총무 담당에게 제출)', risk: '다음 달 신청으로 넘어감', q: 3,
    fb: '영향이 작은 일부터 미루셨네요.' },
  { id: 't5', title: '앱 개선: 개선 범위 확정', cost: 2, due: '다음 주 수요일', risk: '개발 일정 전체가 밀림', q: 2,
    fb: '다음 주 개발팀 일정 전체가 밀릴 수 있어요.' },
  { id: 't6', title: '앱 개선: 고객센터 응대 자료 준비', cost: 1, due: '출시 2주 전', risk: '출시 당일 고객센터 혼란', q: 2,
    fb: '출시 2주 전까지는 꼭 챙겨야 해요. 다음 주 일정에 먼저 넣어 두세요.' },
  { id: 't7', title: '데이터 자동화 도구 익히기 (고정 시간)', cost: 1, due: '없음', risk: '당장은 문제없음', q: 2,
    fb: '미래준비성 업무는 이렇게 또 밀려나요. 다음 주 고정 시간은 지켜질까요?' },
  { id: 't8', title: '타 부서 데이터 추출 요청', cost: 1, due: '"오늘 중으로" (실제 활용은 다음 주, 협의 가능)', risk: '협업 부서 검토 지연', q: 2,
    fb: '실제 마감이 다음 주라 미룰 수 있는 일이었어요. 미루기 전에 상대 부서에 마감을 확인하고 협의하면 더 좋아요.' },
  { id: 't9', title: '오래된 공유 폴더 정리', cost: 1, due: '없음', risk: '당장은 문제없음', q: 4,
    fb: '영향이 작은 일부터 미루셨네요.' },
];

export const R3_BUDGET = 10;

export const R3_EMERGENCY = {
  when: '월요일 오전 10시, 팀장님께 계획을 공유하자마자 긴급 상황 발생!',
  text: '신종 피싱 문자가 급증하고 있습니다. 기존 정기 점검과 별도로 차단 기준 긴급 업데이트가 필요합니다.',
  cost: 2,
  q: 1,
  ask: '계획에서 2칸을 빼야 합니다. 어떤 업무를 다음 주로 미루시겠어요?',
};

export const FINAL = {
  slogan: '나누고, 쪼개고, 순서를 정한다.',
  sub: '업무의 성격을 구분하고, 실행할 수 있는 크기로 나눈 다음, 중요한 일부터 처리한다.',
  rows: [
    ['1. 나누기', '이 업무는 어떤 성격인가?', '업무 4유형과 처리 전략'],
    ['2. 쪼개기', '실행하려면 무엇을 해야 하는가?', 'WBS'],
    ['3. 순서 정하기', '무엇부터 해야 하는가?', '아이젠하워 매트릭스'],
  ],
};

// ---------------- 채점 ----------------
export function scoreR1(r1) {
  const a = (r1 && r1.answers) || {};
  let type = 0, strat = 0;
  for (const c of R1_CARDS) {
    const x = a[c.id];
    if (!x) continue;
    if (c.type.includes(x.type)) type++;
    if (x.strat === c.strat) strat++;
  }
  return { type, strat, total: R1_CARDS.length };
}

export function scoreR2(r2) {
  r2 = r2 || {};
  const place = r2.place || {};
  let s1 = 0;
  for (const p of R2_PIECES) if (place[p.id] && p.ans.includes(place[p.id])) s1++;
  const refine = r2.refine || {};
  let s2 = 0;
  for (const q of R2_REFINE) {
    const o = q.options.find(o => o.id === refine[q.id]);
    if (o && o.correct) s2++;
  }
  const miss = r2.missing || [];
  const found = R2_MISSING.filter(m => m.correct && miss.includes(m.id)).length;
  const wrong = R2_MISSING.filter(m => !m.correct && miss.includes(m.id)).length;
  return { s1, t1: R2_PIECES.length, s2, t2: R2_REFINE.length, found, t3: R2_MISSING.filter(m => m.correct).length, wrong };
}

export function quadTotals(ids, withEmergency) {
  const t = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of ids || []) {
    const c = R3_CARDS.find(c => c.id === id);
    if (c) t[c.q] += c.cost;
  }
  if (withEmergency) t[R3_EMERGENCY.q] += R3_EMERGENCY.cost;
  return t;
}

export function costOf(ids) {
  return (ids || []).reduce((s, id) => s + (R3_CARDS.find(c => c.id === id)?.cost || 0), 0);
}
