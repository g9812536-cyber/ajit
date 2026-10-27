// 아지트 — 채팅 + 음성채널 + 친구 + 서버 만들기
// 실행: npm install && npm start  →  http://localhost:3000
// DATABASE_URL 환경변수가 있으면 Postgres에, 없으면 data.json 파일에 저장해요.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const HOME = 'ajit';
const MAX_HISTORY = 300;
const MAX_TEXT = 2000;
const MAX_CHANNELS = 30;
const MAX_SERVERS_PER_USER = 20;

// ---------- 저장소 ----------
function freshStore() {
  return {
    users: {},      // uid -> { id, username, nick, color, pass, created }
    sessions: {},   // token -> uid
    servers: {},    // sid -> { id, name, color, owner, members: [uid], channels: [{id,name,type}], created }
    relations: {},  // "a__b"(정렬) -> { a, b, from, status: 'pending' | 'friends', ts }
    messages: {},   // key -> [msg]   key = "sid:cid" 또는 "dm:a__b"
  };
}
function homeServer() {
  return {
    id: HOME, name: '아지트', color: '#e08a2e', owner: null, members: [], created: 0,
    channels: [
      { id: 'general', name: '일반', type: 'text' },
      { id: 'study', name: '공부', type: 'text' },
      { id: 'chitchat', name: '잡담', type: 'text' },
      { id: 'lounge', name: '라운지', type: 'voice' },
      { id: 'studyroom', name: '스터디룸', type: 'voice' },
    ],
  };
}

let store = freshStore();
let pool = null;

async function loadStore() {
  let saved = null;
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: false } });
    await pool.query('CREATE TABLE IF NOT EXISTS ajit_kv (k TEXT PRIMARY KEY, v JSONB NOT NULL)');
    const r = await pool.query("SELECT v FROM ajit_kv WHERE k = 'store'");
    saved = r.rows[0]?.v || null;
    console.log('저장 위치: 데이터베이스');
  } else if (fs.existsSync(DATA_FILE)) {
    try { saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { console.warn('data.json 을 읽지 못했어요:', e.message); }
    console.log('저장 위치: data.json');
  }
  if (saved && saved.users) store = Object.assign(freshStore(), saved);
  if (!store.servers[HOME]) store.servers[HOME] = homeServer();
}

let saveTimer = null, saving = false, saveAgain = false;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 800);
}
async function flush() {
  if (saving) { saveAgain = true; return; }
  saving = true;
  const json = JSON.stringify(store);
  try {
    if (pool) await pool.query("INSERT INTO ajit_kv (k, v) VALUES ('store', $1) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", [json]);
    else await fs.promises.writeFile(DATA_FILE, json);
  } catch (e) { console.warn('저장 실패:', e.message); }
  saving = false;
  if (saveAgain) { saveAgain = false; flush(); }
}

// ---------- 도우미 ----------
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const validColor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#5b8def');
const pairKey = (a, b) => [a, b].sort().join('__');
const rid = (n = 8) => Array.from(crypto.randomBytes(n), (x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');

function hashPass(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
function checkPass(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 32);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

const publicUser = (u) => ({ id: u.id, username: u.username, nick: u.nick, color: u.color });
const isMember = (sid, uid) => sid === HOME || !!store.servers[sid]?.members.includes(uid);
function publicServer(s) {
  return { id: s.id, name: s.name, color: s.color, owner: s.owner, channels: s.channels, members: s.id === HOME ? Object.keys(store.users) : s.members };
}
function serversOf(uid) {
  return Object.values(store.servers).filter((s) => isMember(s.id, uid)).map(publicServer);
}
function relationsOf(uid) {
  return Object.values(store.relations).filter((r) => r.a === uid || r.b === uid);
}
const areFriends = (a, b) => store.relations[pairKey(a, b)]?.status === 'friends';

// 채널 키 접근 확인
function canAccess(key, uid) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('dm:')) {
    const [a, b] = key.slice(3).split('__');
    return (a === uid || b === uid) && a !== b && !!store.users[a] && !!store.users[b] && key === 'dm:' + pairKey(a, b);
  }
  const [sid, cid] = key.split(':');
  const s = store.servers[sid];
  return !!s && isMember(sid, uid) && s.channels.some((c) => c.id === cid && c.type === 'text');
}

// ---------- 서버 시작 ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('ok'));

const online = new Map();  // uid -> Set(socket.id)
const voice = new Map();   // socket.id -> { sid: socket.id, uid, server, channel, muted, deafened }

const voiceList = () => [...voice.values()];
const broadcastVoice = () => io.emit('voice-states', voiceList());

io.on('connection', (socket) => {
  let uid = null;
  let sentTimes = [];

  function attach(id) {
    uid = id;
    socket.join('user:' + uid);
    for (const s of serversOf(uid)) socket.join('server:' + s.id);
    if (!online.has(uid)) { online.set(uid, new Set()); io.emit('presence', { uid, online: true }); }
    online.get(uid).add(socket.id);
    return {
      me: publicUser(store.users[uid]),
      users: Object.values(store.users).map(publicUser),
      servers: serversOf(uid),
      relations: relationsOf(uid),
      online: [...online.keys()],
      voice: voiceList(),
    };
  }
  function newSession(id) {
    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = id;
    saveSoon();
    return token;
  }
  const authed = (ack) => { if (!uid) { if (typeof ack === 'function') ack({ error: '다시 로그인해 주세요.' }); return false; } return true; };
  const ok = (ack, v = {}) => typeof ack === 'function' && ack(v);
  const fail = (ack, error) => typeof ack === 'function' && ack({ error });
  const pushRelations = (a, b) => {
    io.to('user:' + a).emit('relations', relationsOf(a));
    io.to('user:' + b).emit('relations', relationsOf(b));
  };
  const pushServer = (s) => io.to('server:' + s.id).emit('server-upsert', publicServer(s));

  // ---- 계정 ----
  socket.on('register', (p, ack) => {
    if (uid) return fail(ack, '이미 로그인돼 있어요.');
    const username = String(p?.username || '').trim().toLowerCase();
    const password = String(p?.password || '');
    const nick = clean(p?.nick, 20) || username;
    if (!/^[a-z0-9_]{3,16}$/.test(username)) return fail(ack, '아이디는 영어 소문자·숫자·_ 로 3~16자예요.');
    if (password.length < 6 || password.length > 100) return fail(ack, '비밀번호는 6자 이상이에요.');
    if (Object.values(store.users).some((u) => u.username === username)) return fail(ack, '이미 있는 아이디예요.');
    const id = 'u' + rid(10);
    store.users[id] = { id, username, nick, color: validColor(p?.color), pass: hashPass(password), created: Date.now() };
    const token = newSession(id);
    const boot = attach(id);
    socket.broadcast.emit('user-upsert', publicUser(store.users[id]));
    io.to('server:' + HOME).emit('server-upsert', publicServer(store.servers[HOME]));
    ok(ack, { token, ...boot });
  });

  socket.on('login', (p, ack) => {
    if (uid) return fail(ack, '이미 로그인돼 있어요.');
    const username = String(p?.username || '').trim().toLowerCase();
    const u = Object.values(store.users).find((x) => x.username === username);
    if (!u || !checkPass(String(p?.password || ''), u.pass)) return fail(ack, '아이디 또는 비밀번호가 맞지 않아요.');
    ok(ack, { token: newSession(u.id), ...attach(u.id) });
  });

  socket.on('auth', (token, ack) => {
    if (uid) return fail(ack, '이미 로그인돼 있어요.');
    const id = store.sessions[String(token || '')];
    if (!id || !store.users[id]) return fail(ack, '로그인이 만료됐어요. 다시 로그인해 주세요.');
    ok(ack, attach(id));
  });

  socket.on('logout', (token) => {
    delete store.sessions[String(token || '')];
    saveSoon();
  });

  socket.on('profile', (p, ack) => {
    if (!authed(ack)) return;
    const u = store.users[uid];
    u.nick = clean(p?.nick, 20) || u.nick;
    u.color = validColor(p?.color || u.color);
    saveSoon();
    io.emit('user-upsert', publicUser(u));
    ok(ack);
  });

  // ---- 메시지 ----
  socket.on('history', (key, ack) => {
    if (!authed(ack)) return;
    if (!canAccess(key, uid)) return fail(ack, '볼 수 없는 채널이에요.');
    ok(ack, { messages: store.messages[key] || [] });
  });

  socket.on('message', (p) => {
    if (!uid) return;
    const key = p?.key;
    const text = String(p?.text ?? '').trim().slice(0, MAX_TEXT);
    if (!text || !canAccess(key, uid)) return;
    if (key.startsWith('dm:')) {
      const [a, b] = key.slice(3).split('__');
      if (!areFriends(a, b)) { socket.emit('notice', '친구인 사람에게만 1:1 메시지를 보낼 수 있어요.'); return; }
    }
    const now = Date.now();
    sentTimes = sentTimes.filter((t) => now - t < 5000);
    if (sentTimes.length >= 8) { socket.emit('notice', '메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 보내 주세요.'); return; }
    sentTimes.push(now);

    const msg = { id: crypto.randomUUID(), key, uid, text, ts: now };
    const list = (store.messages[key] ||= []);
    list.push(msg);
    if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
    saveSoon();
    if (key.startsWith('dm:')) {
      const [a, b] = key.slice(3).split('__');
      io.to('user:' + a).to('user:' + b).emit('message', msg);
    } else {
      io.to('server:' + key.split(':')[0]).emit('message', msg);
    }
  });

  socket.on('typing', (key) => {
    if (!uid || !canAccess(key, uid)) return;
    const data = { key, uid };
    if (key.startsWith('dm:')) {
      const [a, b] = key.slice(3).split('__');
      socket.to('user:' + (a === uid ? b : a)).emit('typing', data);
    } else {
      socket.to('server:' + key.split(':')[0]).emit('typing', data);
    }
  });

  // ---- 서버 ----
  socket.on('create-server', (p, ack) => {
    if (!authed(ack)) return;
    const name = clean(p?.name, 24);
    if (!name) return fail(ack, '서버 이름을 입력해 주세요.');
    if (serversOf(uid).length > MAX_SERVERS_PER_USER) return fail(ack, '서버는 20개까지 들어갈 수 있어요.');
    let id; do { id = rid(8); } while (store.servers[id]);
    const s = {
      id, name, color: validColor(p?.color), owner: uid, members: [uid], created: Date.now(),
      channels: [{ id: 'general', name: '일반', type: 'text' }, { id: 'voice', name: '음성', type: 'voice' }],
    };
    store.servers[id] = s;
    saveSoon();
    io.in('user:' + uid).socketsJoin('server:' + id);
    pushServer(s);
    ok(ack, { server: publicServer(s) });
  });

  function addMember(s, member) {
    if (s.members.includes(member)) return false;
    s.members.push(member);
    saveSoon();
    io.in('user:' + member).socketsJoin('server:' + s.id);
    pushServer(s);
    return true;
  }

  socket.on('join-server', (code, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[String(code || '').trim().toLowerCase()];
    if (!s || s.id === HOME) return fail(ack, '그 초대 코드를 가진 서버가 없어요.');
    if (s.members.includes(uid)) return ok(ack, { server: publicServer(s) });
    addMember(s, uid);
    ok(ack, { server: publicServer(s) });
  });

  socket.on('invite-to-server', (p, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[p?.sid];
    const target = String(p?.uid || '');
    if (!s || s.id === HOME || !s.members.includes(uid)) return fail(ack, '초대할 수 없는 서버예요.');
    if (!areFriends(uid, target)) return fail(ack, '친구만 바로 초대할 수 있어요.');
    addMember(s, target);
    io.to('user:' + target).emit('notice', `${store.users[uid].nick}님이 "${s.name}" 서버에 초대했어요.`);
    ok(ack);
  });

  function kickFromVoice(serverId, member) {
    let changed = false;
    for (const [sockId, v] of voice) {
      if (v.server === serverId && (!member || v.uid === member)) {
        io.to(sockId).emit('voice-kicked');
        io.to('voice:' + v.server + ':' + v.channel).emit('voice-peer-left', sockId);
        io.in(sockId).socketsLeave('voice:' + v.server + ':' + v.channel);
        voice.delete(sockId);
        changed = true;
      }
    }
    if (changed) broadcastVoice();
  }

  socket.on('leave-server', (sid, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[sid];
    if (!s || s.id === HOME || !s.members.includes(uid)) return fail(ack, '나갈 수 없는 서버예요.');
    kickFromVoice(s.id, uid);
    s.members = s.members.filter((m) => m !== uid);
    if (s.owner === uid) s.owner = s.members[0] || null;
    if (!s.members.length) { delete store.servers[s.id]; for (const k of Object.keys(store.messages)) if (k.startsWith(s.id + ':')) delete store.messages[k]; }
    else pushServer(s);
    saveSoon();
    io.in('user:' + uid).socketsLeave('server:' + sid);
    io.to('user:' + uid).emit('server-removed', sid);
    ok(ack);
  });

  socket.on('delete-server', (sid, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[sid];
    if (!s || s.id === HOME || s.owner !== uid) return fail(ack, '서버를 만든 사람만 삭제할 수 있어요.');
    kickFromVoice(s.id);
    io.to('server:' + sid).emit('server-removed', sid);
    io.in('server:' + sid).socketsLeave('server:' + sid);
    delete store.servers[sid];
    for (const k of Object.keys(store.messages)) if (k.startsWith(sid + ':')) delete store.messages[k];
    saveSoon();
    ok(ack);
  });

  socket.on('create-channel', (p, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[p?.sid];
    if (!s || !isMember(s.id, uid)) return fail(ack, '채널을 만들 수 없는 서버예요.');
    const name = clean(p?.name, 24).replace(/\s+/g, '-');
    const type = p?.type === 'voice' ? 'voice' : 'text';
    if (!name) return fail(ack, '채널 이름을 입력해 주세요.');
    if (s.channels.length >= MAX_CHANNELS) return fail(ack, '채널은 30개까지 만들 수 있어요.');
    if (s.channels.some((c) => c.name === name && c.type === type)) return fail(ack, '같은 이름의 채널이 이미 있어요.');
    const ch = { id: 'c' + rid(6), name, type };
    s.channels.push(ch);
    saveSoon();
    pushServer(s);
    ok(ack, { channel: ch });
  });

  // ---- 친구 ----
  socket.on('friend-request', (username, ack) => {
    if (!authed(ack)) return;
    const name = String(username || '').trim().toLowerCase().replace(/^@/, '');
    const target = Object.values(store.users).find((u) => u.username === name);
    if (!target) return fail(ack, '그 아이디를 가진 사람이 없어요.');
    if (target.id === uid) return fail(ack, '나 자신은 친구로 추가할 수 없어요.');
    const k = pairKey(uid, target.id);
    const r = store.relations[k];
    if (r?.status === 'friends') return fail(ack, '이미 친구예요.');
    if (r?.status === 'pending' && r.from === uid) return fail(ack, '이미 요청을 보냈어요.');
    if (r?.status === 'pending' && r.from === target.id) r.status = 'friends'; // 서로 보낸 경우 바로 친구
    else store.relations[k] = { a: [uid, target.id].sort()[0], b: [uid, target.id].sort()[1], from: uid, status: 'pending', ts: Date.now() };
    saveSoon();
    pushRelations(uid, target.id);
    if (store.relations[k].status === 'pending') io.to('user:' + target.id).emit('notice', `${store.users[uid].nick}님이 친구 요청을 보냈어요.`);
    ok(ack, { status: store.relations[k].status, user: publicUser(target) });
  });

  socket.on('friend-respond', (p, ack) => {
    if (!authed(ack)) return;
    const other = String(p?.uid || '');
    const k = pairKey(uid, other);
    const r = store.relations[k];
    if (!r || r.status !== 'pending' || r.from === uid) return fail(ack, '처리할 요청이 없어요.');
    if (p?.accept) { r.status = 'friends'; r.ts = Date.now(); io.to('user:' + other).emit('notice', `${store.users[uid].nick}님이 친구 요청을 수락했어요.`); }
    else delete store.relations[k];
    saveSoon();
    pushRelations(uid, other);
    ok(ack);
  });

  socket.on('friend-remove', (other, ack) => {
    if (!authed(ack)) return;
    const k = pairKey(uid, String(other || ''));
    if (!store.relations[k]) return fail(ack, '친구가 아니에요.');
    delete store.relations[k];
    saveSoon();
    pushRelations(uid, String(other));
    ok(ack);
  });

  // ---- 음성 ----
  function leaveVoice() {
    const v = voice.get(socket.id);
    if (!v) return;
    const room = 'voice:' + v.server + ':' + v.channel;
    socket.to(room).emit('voice-peer-left', socket.id);
    socket.leave(room);
    voice.delete(socket.id);
    broadcastVoice();
  }

  socket.on('voice-join', (p, ack) => {
    if (!authed(ack)) return;
    const s = store.servers[p?.server];
    if (!s || !isMember(s.id, uid) || !s.channels.some((c) => c.id === p?.channel && c.type === 'voice')) return fail(ack, '없는 음성채널이에요.');
    leaveVoice();
    const room = 'voice:' + s.id + ':' + p.channel;
    const peers = [...voice.values()].filter((v) => v.server === s.id && v.channel === p.channel).map((v) => v.sid);
    voice.set(socket.id, { sid: socket.id, uid, server: s.id, channel: p.channel, muted: !!p?.muted, deafened: !!p?.deafened });
    socket.join(room);
    broadcastVoice();
    ok(ack, { peers });
  });
  socket.on('voice-leave', () => leaveVoice());
  socket.on('voice-state', (p) => {
    const v = voice.get(socket.id);
    if (!v) return;
    v.muted = !!p?.muted; v.deafened = !!p?.deafened;
    broadcastVoice();
  });
  socket.on('speaking', (on) => {
    if (!voice.has(socket.id)) return;
    io.emit('speaking', { sid: socket.id, speaking: !!on });
  });
  socket.on('signal', (p) => {
    const me = voice.get(socket.id);
    const target = voice.get(String(p?.to || ''));
    if (!me || !target || target.server !== me.server || target.channel !== me.channel) return;
    io.to(target.sid).emit('signal', { from: socket.id, data: p.data });
  });

  socket.on('disconnect', () => {
    leaveVoice();
    if (!uid) return;
    const set = online.get(uid);
    if (set) {
      set.delete(socket.id);
      if (!set.size) { online.delete(uid); io.emit('presence', { uid, online: false }); }
    }
  });
});

loadStore().then(() => {
  server.listen(PORT, () => console.log(`아지트 서버 실행 중 → http://localhost:${PORT}`));
}).catch((e) => {
  console.error('저장소를 열지 못했어요. DATABASE_URL 을 확인해 주세요.\n', e.message);
  process.exit(1);
});

// 종료할 때 마지막 내용 저장
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { clearTimeout(saveTimer); await flush(); process.exit(0); });
}
