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
  { id: 'focus', label: '가장 좋은 시간에 먼저 하기 (고정 시간 확보)', short: '가장 좋은 시간에 먼저 하기', desc: '하루 중 집중이 가장 잘 되는 시간을 고정해 두고, 핵심업무를 그 시간에 먼저 한다', type: 'core' },
  { id: 'batch', label: '정해진 시간에 묶어서 하기', short: '정해진 시간에 묶어서 하기', desc: '반복되는 일은 정해진 시간에 한꺼번에 처리한다', type: 'support' },
  { id: 'split', label: '쪼개서 관리하기', short: '쪼개서 관리하기', desc: '큰 일은 작은 단계로 나누고 중간 점검한다', type: 'project' },
  { id: 'fixed', label: '조금씩 꾸준히 투자하기', short: '조금씩 꾸준히 투자하기', desc: '급하지 않아도 매주 일정 시간을 떼어 꾸준히 한다', type: 'future' },
  { id: 'gap',   label: '틈틈이 하기', short: '틈틈이 하기', desc: '다른 일 사이사이, 짬이 날 때마다 조금씩 한다', trap: true },
  { id: 'spare', label: '여유 있을 때 하기', short: '여유 있을 때 하기', desc: '급한 일을 먼저 끝내고 남는 시간에 한다', trap: true },
];

export const R1_CARDS = [
  { id: 'c1', title: '월간 이용 지표 보고', text: '매달 말일에 이용 데이터가 도착하면, 5일까지 분석해 팀장에게 보고한다. 평가에 바로 반영된다.', type: ['core'], strat: 'focus' , reason: '매달 반복해서 책임지는 업무이고 평가에 바로 반영됩니다. 데이터가 도착하는 말일 이후, 집중이 가장 잘 되는 시간을 미리 고정해 두고 그 시간에 먼저 합니다.' },
  { id: 'c2', title: '신규 피싱 패턴 분석', text: '매주 새 피싱 유형을 분석해 차단 기준을 업데이트한다. 놓치면 서비스 안정성에 문제가 생긴다.', type: ['core'], strat: 'focus' , reason: '매주 반복되고, 평가 기준인 서비스 안정성과 바로 연결됩니다. 놓치면 안 되는 정밀한 분석이라, 매주 집중이 잘 되는 시간을 고정해 두고 그 시간에 먼저 합니다.' },
  { id: 'c3', title: '고객센터 문의 답변', text: '고객센터가 전달하는 문의에 하루 평균 20건 답변한다. 대부분 정형화된 문의다.', type: ['support'], strat: 'batch', debate: true , reason: '고객 만족도에 기여하지만, 업무의 형태는 매일 반복되는 정형화된 지원 업무입니다. 정해진 시간에 모아서 답하고 자주 쓰는 답변은 템플릿으로 만듭니다.' },
  { id: 'c4', title: '주간 회의록 정리·공유', text: '매주 월요일 부서 회의 후 정리해 공유한다.', type: ['support'], strat: 'batch' , reason: '조직 운영을 지원하는 반복 업무입니다. 양식으로 표준화해 두고, 회의 직후 정해진 시간에 한 번에 처리합니다.' },
  { id: 'c5', title: 'FAQ 전면 개편', text: '반복 문의를 분석해 12월 15일까지 FAQ를 개편한다.', type: ['project'], strat: 'split' , reason: '12월 15일에 결과물을 완성하면 끝나는 업무입니다. 분석, 초안, 검토, 게시 단계로 나누고 중간 점검을 합니다.' },
  { id: 'c6', title: '앱 개선 프로젝트', text: '12월 말 출시 예정이며, 올해 핵심 목표다. 개발팀, 마케팅팀과 함께 진행한다.', type: ['project', 'core'], strat: 'split', debate: true , reason: '성과로는 핵심 목표지만, 출시하면 끝나는 업무입니다. 업무 유형은 "끝이 있는가?"를 먼저 묻습니다. 여러 부서와 일정을 맞춰야 하니 단계로 쪼개고 중간 점검을 해야 합니다.' },
  { id: 'c7', title: '데이터 자동화 도구 익히기', text: '익혀 두면 보고서 작성 시간이 크게 줄어든다. 정해진 기한은 없다.', type: ['future'], strat: 'fixed' , reason: '당장의 성과보다 앞으로의 효율을 높이는 투자입니다. 기한이 없는 일은 여유 있을 때 하려고 하면 결국 하지 못하니, 매주 조금씩 떼어 꾸준히 투자합니다.' },
  { id: 'c8', title: '보안 서비스 트렌드 파악하기', text: '국내외 보안 서비스의 새로운 기능과 동향을 파악하며 우리 서비스 개선 아이디어를 모은다. 정해진 기한은 없다.', type: ['future'], strat: 'fixed' , reason: '서비스 개선 아이디어를 위해 미리 준비하는 일입니다. 한 번에 끝나는 일이 아니라 꾸준히 따라가야 하니, 매주 조금씩 시간을 떼어 투자합니다.' },
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
  { id: 'big',     label: '더 쪼개야 할 작업', hint: '무엇을 할지 불분명한 작업' },
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
  urgent: '급한가? 이번 주 안에 끝내야 하는가?',
  important: '중요한가? 안 하면 평가·서비스·고객에 큰 영향이 있는가?',
  who: '내가 꼭 해야 하는가? 다른 사람이 해도 되는 일인가?',
  criteria: '서비스 안정성 · 고객 만족도 · 월간 이용 지표 · 앱 개선 프로젝트 성공',
};

// label = 카드 넣을 때 보이는 이름, action = 정답 화면에서 공개하는 이름
export const QUADS = {
  1: { label: '중요 및 긴급',     action: '우선 처리', dot: '🔴', cls: 'q1', how: '바로 처리한다' },
  2: { label: '중요 및 미긴급',   action: '일정 계획', dot: '🟢', cls: 'q2', how: '일정에 먼저 넣는다' },
  3: { label: '미중요 및 긴급',   action: '위임',     dot: '🟡', cls: 'q3', how: '다른 사람에게 맡기거나 마감을 협의한다' },
  4: { label: '미중요 및 미긴급', action: '제거',     dot: '⚪', cls: 'q4', how: '줄이거나 뺀다' },
};
// 보내주신 모형과 같은 배치: 위 [중요·미긴급][중요·긴급] / 아래 [미중요·미긴급][미중요·긴급]
export const QUAD_LAYOUT = [2, 1, 4, 3];

export const R3_CARDS = [
  { id: 't1', title: '월간 이용 지표 보고', due: '이번 주 금요일', risk: '팀장 보고 누락, 평가에 반영', who: '김대리가 직접', q: 1,
    reason: '이번 주 마감이고 평가에 바로 반영되며, 김대리가 직접 해야 하는 일입니다.' },
  { id: 't2', title: '정기 피싱 패턴 분석 및 차단 기준 점검', due: '이번 주 목요일', risk: '새 피싱 문자 차단 누락 위험', who: '김대리가 직접', q: 1,
    reason: '이번 주 마감이고, 놓치면 서비스 안정성에 바로 문제가 생깁니다.' },
  { id: 't3', title: '고객 문의 답변', due: '매일', risk: '고객 불만 증가', who: '김대리가 직접', q: 1,
    reason: '매일 해야 하고, 평가 기준인 고객 만족도에 바로 영향을 줍니다.' },
  { id: 't5', title: '앱 개선: 개선 범위 확정', due: '다음 주 수요일', risk: '개발 일정 전체가 밀림', who: '김대리가 직접', q: 2,
    reason: '지금 급하지는 않지만, 늦으면 개발 일정 전체가 밀립니다. 프로젝트성 업무는 미리 일정에 넣어 두어야 합니다.' },
  { id: 't6', title: '앱 개선: 고객센터 응대 자료 준비', due: '출시 2주 전', risk: '출시 당일 고객센터 혼란', who: '김대리가 직접', q: 2,
    reason: '여유는 있지만, 빠지면 출시 당일 고객센터가 혼란스럽습니다. 미리 일정에 넣어 둡니다.' },
  { id: 't10', title: 'FAQ 개편: 반복 문의 분석', due: '다음 주 금요일', risk: '12월 15일 FAQ 개편 일정이 밀림', who: '김대리가 직접', q: 2,
    reason: '다음 주 마감이지만, 이 단계가 늦으면 FAQ 개편 전체가 밀립니다. 미리 일정에 넣어 둡니다.' },
  { id: 't4', title: '팀 비품 신청 취합', due: '내일', risk: '다음 달 신청으로 넘어감', who: '팀원 누구나 가능', q: 3,
    reason: '내일 마감이라 급하지만, 김대리의 성과와 관련이 적고 팀원 누구나 할 수 있는 일입니다. 다른 사람에게 맡기거나 짧게 끝냅니다.' },
  { id: 't8', title: '타 부서 데이터 추출 요청', due: '오늘 중', risk: '협업 부서 검토 지연', who: '정해진 양식이라 팀 후배도 가능', q: 3,
    reason: '오늘 마감이지만, 정해진 양식으로 뽑기만 하면 되는 일이라 후배에게 맡길 수 있습니다. 맡길 때는 마감과 양식을 분명히 전달합니다.' },
  { id: 't9', title: '오래된 공유 폴더 정리', due: '없음', risk: '당장은 문제없음', who: '누구나', q: 4,
    reason: '기한도 없고 당장 영향도 없습니다. 줄이거나 시간이 남을 때 합니다.' },
];

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



export function scoreR3(r3) {
  const q = (r3 && r3.quad) || {};
  return { ok: R3_CARDS.filter(c => q[c.id] === c.q).length, total: R3_CARDS.length };
}
