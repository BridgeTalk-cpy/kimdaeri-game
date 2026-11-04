// 데이터 저장소: 파이어베이스(실전) 또는 로컬 데모(테스트) 중 하나로 동작
import { firebaseConfig } from './config.js';

const FB_VER = '10.12.2';
const forceDemo = /[?&]demo\b/.test(location.search);
const useFirebase = !!(firebaseConfig && firebaseConfig.apiKey) && !forceDemo;

function deepMerge(a, b) {
  const out = Array.isArray(a) ? [...a] : { ...(a || {}) };
  for (const k of Object.keys(b || {})) {
    const v = b[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

// ---------------- 로컬 데모 저장소 ----------------
function makeLocalStore() {
  const KEY = 'kimdaeri_demo_db';
  const ch = ('BroadcastChannel' in window) ? new BroadcastChannel('kimdaeri') : null;
  const listeners = new Set();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const write = (db) => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
    ch && ch.postMessage('changed');
    listeners.forEach(f => f());
  };
  const onChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
  ch && (ch.onmessage = () => listeners.forEach(f => f()));
  window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach(f => f()); });

  return {
    mode: 'demo',
    async init() {},
    subscribeSession(cb) {
      const run = () => cb(read().session || null);
      run();
      return onChange(run);
    },
    async setSession(data) {
      const db = read();
      db.session = deepMerge(db.session, data);
      write(db);
    },
    async getPlayer(runId, pid) {
      return ((read().runs || {})[runId] || {})[pid] || null;
    },
    async savePlayer(runId, pid, partial) {
      const db = read();
      db.runs = db.runs || {};
      db.runs[runId] = db.runs[runId] || {};
      db.runs[runId][pid] = deepMerge(db.runs[runId][pid], { ...partial, updatedAt: Date.now() });
      write(db);
    },
    subscribePlayers(runId, cb) {
      const run = () => {
        const m = ((read().runs || {})[runId]) || {};
        cb(Object.entries(m).map(([id, v]) => ({ id, ...v })));
      };
      run();
      return onChange(run);
    },
  };
}

// ---------------- 파이어베이스 저장소 ----------------
function makeFirebaseStore() {
  let fs, db;
  return {
    mode: 'firebase',
    async init() {
      const app = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`);
      fs = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`);
      const a = app.initializeApp(firebaseConfig);
      try {
        db = fs.initializeFirestore(a, { experimentalAutoDetectLongPolling: true });
      } catch {
        db = fs.getFirestore(a);
      }
    },
    subscribeSession(cb) {
      return fs.onSnapshot(fs.doc(db, 'sessions', 'main'),
        (s) => cb(s.exists() ? s.data() : null),
        (e) => { console.error(e); cb(undefined, e); });
    },
    async setSession(data) {
      await fs.setDoc(fs.doc(db, 'sessions', 'main'), data, { merge: true });
    },
    async getPlayer(runId, pid) {
      const s = await fs.getDoc(fs.doc(db, 'runs', runId, 'players', pid));
      return s.exists() ? s.data() : null;
    },
    async savePlayer(runId, pid, partial) {
      await fs.setDoc(fs.doc(db, 'runs', runId, 'players', pid), { ...partial, updatedAt: Date.now() }, { merge: true });
    },
    subscribePlayers(runId, cb) {
      return fs.onSnapshot(fs.collection(db, 'runs', runId, 'players'),
        (qs) => cb(qs.docs.map(d => ({ id: d.id, ...d.data() }))),
        (e) => console.error(e));
    },
  };
}

export const store = useFirebase ? makeFirebaseStore() : makeLocalStore();

// 저장 실패 시 재시도 (네트워크가 잠깐 끊겨도 응답이 사라지지 않게)
const queue = [];
let flushing = false;
export function saveWithRetry(runId, pid, partial) {
  queue.push([runId, pid, partial]);
  flush();
}
async function flush() {
  if (flushing) return;
  flushing = true;
  while (queue.length) {
    const [r, p, d] = queue[0];
    try {
      await store.savePlayer(r, p, d);
      queue.shift();
      setNet(true);
    } catch (e) {
      console.warn('save failed, retrying', e);
      setNet(false);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  flushing = false;
}
let netCb = null;
export function onNet(cb) { netCb = cb; }
function setNet(ok) { netCb && netCb(ok); }

export function safeLS(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch { return null; }
}
