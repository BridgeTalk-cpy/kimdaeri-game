// =============================================================
//  설정 파일 — 강사님이 바꾸는 곳은 여기뿐입니다.
// =============================================================

// 1) 파이어베이스 콘솔에서 복사한 firebaseConfig 값을 아래에 붙여 넣으세요.
//    apiKey가 비어 있거나 주소 끝에 ?demo 를 붙이면 '로컬 데모 모드'로 동작합니다(같은 브라우저 안에서만 테스트).
export const firebaseConfig = {
  apiKey: "AIzaSyBS7fBW1TUS-LsQv61IpveFdXSn6lBG650",
  authDomain: "kimdaeri-game.firebaseapp.com",
  projectId: "kimdaeri-game",
  storageBucket: "kimdaeri-game.firebasestorage.app",
  messagingSenderId: "770735445675",
  appId: "1:770735445675:web:c2d91a80519b31ab83c9ee",
};

// 2) 강사 화면 비밀번호 (숫자 4자리 권장)
export const HOST_PIN = "1105";

// 3) 강사 화면 첫 장에 보여줄 와이파이 안내 (비워 두면 표시하지 않음)
export const WIFI = {
  name: "",
  password: "",
};

// 4) 과정명 (화면 상단에 표시)
export const COURSE_TITLE = "스마트워크 기반 업무관리 및 시간관리 역량 강화";
