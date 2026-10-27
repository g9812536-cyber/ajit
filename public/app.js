// 아지트 클라이언트 — 계정, 친구, 서버, 채팅, 음성(WebRTC)
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const HOME = 'ajit';
  const COLORS = ['#5b8def', '#e0607e', '#2fa36b', '#e08a2e', '#9b6bf2', '#1fa5b4', '#d9573b', '#6f7a90'];
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  const GROUP_GAP = 5 * 60 * 1000;

  // ---------- 아이콘 ----------
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    hash: svg('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
    speaker: svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>'),
    micOff: svg('<path d="m2 2 20 20"/><path d="M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7"/><path d="M19 10a7 7 0 0 1-1.2 3.9M5 10a7 7 0 0 0 11.2 5.6M12 17v5"/>'),
    head: svg('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>'),
    headOff: svg('<path d="m2 2 20 20"/><path d="M3 18v-6a9 9 0 0 1 2.7-6.4M9 3.5A9 9 0 0 1 21 12v4"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/>'),
    hang: svg('<path d="M10.7 13.3a10 10 0 0 0 4.7 2.3l1.6-1.6a1 1 0 0 1 1.1-.2c1 .4 2.1.6 3.2.6a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 4 3a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1c0 1.1.2 2.2.6 3.2a1 1 0 0 1-.2 1.1L8.4 8.9"/><path d="m22 2-20 20"/>'),
    users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    friend: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  };
  $('#menuBtn').innerHTML = ICON.menu;
  $('#membersBtn').innerHTML = ICON.users;
  $('#sendBtn').innerHTML = ICON.send;
  $('#serverSettingsBtn').innerHTML = ICON.gear;
  $('#profileBtn').innerHTML = ICON.gear;
  $('#leaveVoiceBtn').innerHTML = ICON.hang;

  // ---------- 상태 ----------
  const S = {
    me: null,
    users: new Map(),
    servers: new Map(),
    relations: [],
    online: new Set(),
    voice: [],            // [{ sid(소켓), uid, server, channel, muted, deafened }]
    view: { kind: 'server', sid: HOME, cid: 'general' },
    messages: new Map(),  // key -> [msg]
    loading: new Set(),
    unread: new Set(),
    typing: new Map(),    // key -> Map(uid -> until)
    speaking: new Set(),  // 소켓 id
    friendTab: 'online',
    search: '',
  };
  const V = { // 내 음성 상태
    server: null, channel: null, stream: null, peers: new Map(),
    ctx: null, meterTimer: null, meterSrc: null,
    muted: false, deafened: false, speaking: false,
  };

  const local = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* 무시 */ } },
  };
  const savedView = local.get('ajit-view', null);
  if (savedView && typeof savedView === 'object') S.view = savedView;

  // ---------- 도우미 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+[^\s<.,!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  const initial = (n) => (Array.from(n || '?')[0] || '?').toUpperCase();
  const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const byName = (a, b) => nameOf(a).localeCompare(nameOf(b), 'ko');
  const user = (uid) => S.users.get(uid);
  const nameOf = (uid) => user(uid)?.nick || '알 수 없음';
  const colorOf = (uid) => user(uid)?.color || '#6f7a90';
  const pairKey = (a, b) => [a, b].sort().join('__');
  const dmKey = (peer) => 'dm:' + pairKey(S.me.id, peer);
  const keyOf = (v = S.view) => v.kind === 'server' ? `${v.sid}:${v.cid}` : v.kind === 'dm' ? dmKey(v.peer) : null;
  const server = (sid) => S.servers.get(sid);
  const channel = (sid, cid) => server(sid)?.channels.find((c) => c.id === cid);

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, onClick) { const b = el('button', cls, label); b.type = 'button'; if (onClick) b.onclick = onClick; return b; }
  function avatarEl(uid, size, opts = {}) {
    const a = el('div', 'avatar' + (size ? ' ' + size : ''), initial(nameOf(uid)));
    a.style.setProperty('--c', colorOf(uid));
    if (opts.online && S.online.has(uid)) a.classList.add('online');
    if (opts.speakSid) { a.dataset.speak = opts.speakSid; if (S.speaking.has(opts.speakSid)) a.classList.add('speaking'); }
    return a;
  }

  let toastTimer = null;
  function toast(text, ms = 4200) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // 친구 관계
  const friends = () => S.relations.filter((r) => r.status === 'friends').map((r) => (r.a === S.me.id ? r.b : r.a));
  const pendingIn = () => S.relations.filter((r) => r.status === 'pending' && r.from !== S.me.id);
  const pendingOut = () => S.relations.filter((r) => r.status === 'pending' && r.from === S.me.id);
  const other = (r) => (r.a === S.me.id ? r.b : r.a);
  function relation(uid) {
    const r = S.relations.find((x) => other(x) === uid);
    if (!r) return 'none';
    if (r.status === 'friends') return 'friend';
    return r.from === S.me.id ? 'sent' : 'received';
  }
  const voiceOf = (uid) => S.voice.find((v) => v.uid === uid);

  // ---------- 색 고르기 ----------
  function swatches(box, getter, setter) {
    const draw = () => {
      box.innerHTML = '';
      COLORS.forEach((c, i) => {
        const b = btn('', 'swatch', () => { setter(c); draw(); });
        b.style.setProperty('--c', c);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(c === getter()));
        b.setAttribute('aria-label', `색 ${i + 1}`);
        box.appendChild(b);
      });
    };
    draw();
    return draw;
  }

  // ---------- 연결 ----------
  if (typeof io !== 'function') {
    $('#authStatus').textContent = '서버에 연결하지 못했어요. 서버(npm start)가 켜져 있는지 확인해 주세요.';
    return;
  }
  const socket = io();
  let booted = false;

  socket.on('connect', () => {
    $('#connDot').classList.add('on');
    const token = local.get('ajit-token', null);
    if (token) {
      $('#authStatus').textContent = '로그인하는 중…';
      socket.emit('auth', token, (res) => {
        if (res.error) { local.del('ajit-token'); showAuth(booted ? res.error : ''); return; }
        boot(res);
      });
    } else {
      showAuth('');
    }
  });
  socket.on('connect_error', () => { $('#authStatus').textContent = '서버에 연결하지 못했어요. 잠시 후 자동으로 다시 시도해요.'; });
  socket.on('disconnect', () => {
    $('#connDot').classList.remove('on');
    if (V.channel) teardownVoice();
    if (booted) toast('서버와 연결이 끊겼어요. 다시 연결하는 중이에요…');
  });

  function showAuth(err) {
    $('#auth').hidden = false;
    $('#app').hidden = true;
    $('#authStatus').textContent = '';
    $('#authError').textContent = err || '';
    $('#authError').hidden = !err;
  }

  // ---------- 로그인 / 가입 ----------
  let regColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  swatches($('#regSwatches'), () => regColor, (c) => { regColor = c; });
  function authTab(which) {
    $('#tabLogin').setAttribute('aria-selected', String(which === 'login'));
    $('#tabRegister').setAttribute('aria-selected', String(which === 'register'));
    $('#loginForm').hidden = which !== 'login';
    $('#registerForm').hidden = which !== 'register';
    $('#authError').hidden = true;
  }
  $('#tabLogin').onclick = () => authTab('login');
  $('#tabRegister').onclick = () => authTab('register');

  function authDone(res) {
    if (res.error) { $('#authError').textContent = res.error; $('#authError').hidden = false; return; }
    local.set('ajit-token', res.token);
    boot(res);
  }
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!socket.connected) { toast('서버에 연결되면 다시 눌러 주세요.'); return; }
    socket.emit('login', { username: $('#loginUser').value, password: $('#loginPass').value }, authDone);
  });
  $('#registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!socket.connected) { toast('서버에 연결되면 다시 눌러 주세요.'); return; }
    socket.emit('register', {
      username: $('#regUser').value, password: $('#regPass').value,
      nick: $('#regNick').value, color: regColor,
    }, authDone);
  });
  $('#regUser').addEventListener('input', (e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); });

  function boot(data) {
    S.me = data.me;
    S.users = new Map(data.users.map((u) => [u.id, u]));
    S.servers = new Map(data.servers.map((s) => [s.id, s]));
    S.relations = data.relations;
    S.online = new Set(data.online);
    S.voice = data.voice;
    S.messages.clear();
    S.loading.clear();
    booted = true;
    $('#auth').hidden = true;
    $('#app').hidden = false;
    go(S.view, true);
  }

  // ---------- 서버 이벤트 ----------
  socket.on('user-upsert', (u) => {
    S.users.set(u.id, u);
    if (S.me && u.id === S.me.id) S.me = u;
    renderAll();
  });
  socket.on('presence', ({ uid, online }) => {
    if (online) S.online.add(uid); else S.online.delete(uid);
    renderRail(); renderSidebar(); renderMembers();
    if (S.view.kind === 'home') renderFriendsSafe();
  });
  socket.on('relations', (list) => {
    S.relations = list;
    if (S.view.kind === 'dm' && relation(S.view.peer) !== 'friend') go({ kind: 'home' });
    else renderAll();
    if (!$('#settingsModal').hidden) renderSettings();
  });
  socket.on('server-upsert', (s) => {
    S.servers.set(s.id, s);
    if (S.view.kind === 'server' && S.view.sid === s.id && !channel(s.id, S.view.cid)) go({ kind: 'server', sid: s.id, cid: firstText(s.id) });
    else renderAll();
    if (!$('#settingsModal').hidden) renderSettings();
  });
  socket.on('server-removed', (sid) => {
    const name = server(sid)?.name;
    S.servers.delete(sid);
    for (const k of [...S.unread]) if (k.startsWith(sid + ':')) S.unread.delete(k);
    if (S.view.kind === 'server' && S.view.sid === sid) {
      $('#settingsModal').hidden = true;
      go({ kind: 'server', sid: HOME, cid: 'general' });
      if (name) toast(`"${name}" 서버에서 나왔어요.`);
    } else renderRail();
  });
  socket.on('message', onMessage);
  socket.on('typing', ({ key, uid }) => {
    if (!S.typing.has(key)) S.typing.set(key, new Map());
    S.typing.get(key).set(uid, Date.now() + 3500);
    renderTyping();
  });
  socket.on('notice', (t) => toast(t));
  socket.on('voice-states', (list) => {
    S.voice = list;
    const alive = new Set(list.map((v) => v.sid));
    for (const s of [...S.speaking]) if (!alive.has(s)) S.speaking.delete(s);
    renderSidebar(); renderMembers();
  });
  socket.on('speaking', ({ sid, speaking }) => setSpeaking(sid, speaking));
  socket.on('signal', onSignal);
  socket.on('voice-peer-left', closePeer);
  socket.on('voice-kicked', () => teardownVoice());

  // ---------- 화면 이동 ----------
  function firstText(sid) { return server(sid)?.channels.find((c) => c.type === 'text')?.id || 'general'; }
  let justOpened = true;
  function go(v, initial = false) {
    if (v.kind === 'server') {
      if (!server(v.sid)) v = { kind: 'server', sid: HOME, cid: 'general' };
      const ch = channel(v.sid, v.cid);
      if (!ch || ch.type !== 'text') v = { kind: 'server', sid: v.sid, cid: firstText(v.sid) };
    } else if (v.kind === 'dm') {
      if (!v.peer || relation(v.peer) !== 'friend') v = { kind: 'home' };
    } else {
      v = { kind: 'home' };
    }
    S.view = v;
    local.set('ajit-view', v);
    if (!initial) closeDrawers();
    newChForm.hidden = true;
    const key = keyOf(v);
    if (key) S.unread.delete(key);
    justOpened = true;
    if (key && !S.messages.has(key) && !S.loading.has(key)) {
      S.loading.add(key);
      socket.emit('history', key, (res) => {
        S.loading.delete(key);
        if (res.error) { toast(res.error); return; }
        S.messages.set(key, res.messages);
        if (keyOf() === key) { justOpened = true; renderMessages(); }
      });
    }
    renderAll();
  }

  // ---------- 렌더링 ----------
  function renderAll() {
    if (!S.me) return;
    renderRail(); renderSidebar(); renderHead(); renderMe(); renderMembers(); renderTyping();
    if (S.view.kind === 'home') renderFriendsSafe(); else renderMessages();
  }

  function renderRail() {
    if (!S.me) return;
    const rail = $('#rail');
    rail.innerHTML = '';
    const home = btn('', 'rail-btn' + (S.view.kind !== 'server' ? ' active' : ''), () => go({ kind: 'home' }));
    home.innerHTML = ICON.friend;
    home.title = '친구 · 1:1 메시지';
    home.setAttribute('aria-label', '친구와 1:1 메시지');
    const n = pendingIn().length;
    if (n) home.appendChild(el('span', 'badge', String(n)));
    if ([...S.unread].some((k) => k.startsWith('dm:'))) home.classList.add('unread');
    rail.append(home, el('div', 'rail-sep'));

    const list = [...S.servers.values()].sort((a, b) => (a.id === HOME ? -1 : b.id === HOME ? 1 : 0));
    for (const s of list) {
      const b = btn(initial(s.name), 'rail-btn server' + (S.view.kind === 'server' && S.view.sid === s.id ? ' active' : ''), () => go({ kind: 'server', sid: s.id, cid: firstText(s.id) }));
      b.style.setProperty('--c', s.color);
      b.title = s.name;
      b.setAttribute('aria-label', s.name + ' 서버');
      if ([...S.unread].some((k) => k.startsWith(s.id + ':'))) b.classList.add('unread');
      rail.appendChild(b);
    }
    const add = btn('', 'rail-btn add', openServerModal);
    add.innerHTML = ICON.plus;
    add.title = '서버 만들기 · 참가';
    add.setAttribute('aria-label', '서버 만들기 또는 참가');
    rail.appendChild(add);
  }

  // 채널 만들기 폼 (사이드바에 다시 붙임)
  const newChForm = document.createElement('form');
  newChForm.className = 'new-ch';
  newChForm.hidden = true;
  newChForm.autocomplete = 'off';
  newChForm.innerHTML = '<input id="newChName" class="text-input compact" maxlength="24"><button type="submit" class="primary-btn compact">만들기</button>';
  let newChType = 'text';
  newChForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#newChName').value.trim();
    if (!name || S.view.kind !== 'server') return;
    socket.emit('create-channel', { sid: S.view.sid, name, type: newChType }, (res) => {
      if (res.error) { toast(res.error); return; }
      $('#newChName').value = '';
      newChForm.hidden = true;
      if (res.channel.type === 'text') go({ kind: 'server', sid: S.view.sid, cid: res.channel.id });
    });
  });
  function toggleNewCh(type, anchor) {
    if (!newChForm.hidden && newChType === type) { newChForm.hidden = true; return; }
    newChType = type;
    anchor.after(newChForm);
    newChForm.hidden = false;
    const inp = $('#newChName');
    inp.placeholder = type === 'text' ? '새 채팅 채널 이름' : '새 음성 채널 이름';
    inp.focus();
  }

  function renderSidebar() {
    if (!S.me) return;
    const body = $('#sideBody');
    const keepForm = !newChForm.hidden;
    body.innerHTML = '';
    const v = S.view;
    $('#serverSettingsBtn').hidden = !(v.kind === 'server' && v.sid !== HOME);

    if (v.kind === 'server') {
      const s = server(v.sid);
      $('#sideTitle').textContent = s.name;
      for (const type of ['text', 'voice']) {
        const cat = el('div', 'cat' + (type === 'voice' ? ' spaced' : ''));
        cat.appendChild(el('span', '', type === 'text' ? '채팅 채널' : '음성 채널'));
        const add = btn('', 'icon-btn small', () => toggleNewCh(type, cat));
        add.innerHTML = ICON.plus;
        add.title = add.ariaLabel = type === 'text' ? '채팅 채널 만들기' : '음성 채널 만들기';
        cat.appendChild(add);
        body.appendChild(cat);
        if (keepForm && newChType === type) cat.after(newChForm);
        const ul = el('ul', 'ch-list');
        for (const ch of s.channels.filter((c) => c.type === type)) {
          const li = el('li');
          if (type === 'text') {
            const key = `${s.id}:${ch.id}`;
            const b = btn('', 'ch' + (ch.id === v.cid ? ' active' : '') + (S.unread.has(key) ? ' unread' : ''), () => go({ kind: 'server', sid: s.id, cid: ch.id }));
            if (ch.id === v.cid) b.setAttribute('aria-current', 'true');
            b.innerHTML = ICON.hash;
            b.appendChild(el('span', 'ch-name', ch.name));
            li.appendChild(b);
          } else {
            const inHere = V.server === s.id && V.channel === ch.id;
            const b = btn('', 'ch' + (inHere ? ' in-voice' : ''), () => joinVoice(s.id, ch.id));
            b.title = inHere ? '참여 중' : '눌러서 참여';
            b.innerHTML = ICON.speaker;
            b.appendChild(el('span', 'ch-name', ch.name));
            li.appendChild(b);
            const people = S.voice.filter((x) => x.server === s.id && x.channel === ch.id);
            if (people.length) {
              const vul = el('ul', 'voice-users');
              for (const p of people) {
                const vu = el('li', 'voice-user');
                vu.appendChild(avatarEl(p.uid, 'sm', { speakSid: p.sid }));
                vu.appendChild(el('span', 'vu-name', nameOf(p.uid)));
                const flags = el('span', 'vu-flags');
                flags.innerHTML = (p.muted ? ICON.micOff : '') + (p.deafened ? ICON.headOff : '');
                vu.appendChild(flags);
                vul.appendChild(vu);
              }
              li.appendChild(vul);
            }
          }
          ul.appendChild(li);
        }
        body.appendChild(ul);
      }
    } else {
      $('#sideTitle').textContent = '친구';
      const ul = el('ul', 'ch-list');
      const li = el('li');
      const fb = btn('', 'ch' + (v.kind === 'home' ? ' active' : ''), () => go({ kind: 'home' }));
      fb.innerHTML = ICON.friend;
      fb.appendChild(el('span', 'ch-name', '친구 목록'));
      if (pendingIn().length) fb.appendChild(el('span', 'pill', String(pendingIn().length)));
      li.appendChild(fb);
      ul.appendChild(li);
      body.appendChild(ul);

      body.appendChild(el('div', 'cat spaced', '1:1 메시지'));
      const list = friends().sort((a, b) => (S.online.has(b) - S.online.has(a)) || byName(a, b));
      if (!list.length) body.appendChild(el('p', 'side-empty', '친구를 추가하면 여기서 1:1로 대화할 수 있어요.'));
      const dl = el('ul', 'ch-list');
      for (const uid of list) {
        const li2 = el('li');
        const key = dmKey(uid);
        const b = btn('', 'ch' + (v.kind === 'dm' && v.peer === uid ? ' active' : '') + (S.unread.has(key) ? ' unread' : ''), () => go({ kind: 'dm', peer: uid }));
        b.appendChild(avatarEl(uid, 'sm', { online: true }));
        b.appendChild(el('span', 'ch-name', nameOf(uid)));
        li2.appendChild(b);
        dl.appendChild(li2);
      }
      body.appendChild(dl);
    }
  }

  function renderHead() {
    const v = S.view;
    $('#friendsPane').hidden = v.kind !== 'home';
    $('#chatPane').hidden = v.kind === 'home';
    const mark = $('#headMark');
    if (v.kind === 'home') { mark.textContent = ''; $('#chanTitle').textContent = '친구'; }
    else if (v.kind === 'dm') { mark.textContent = '@'; $('#chanTitle').textContent = nameOf(v.peer); $('#msgInput').placeholder = `@${nameOf(v.peer)}에게 메시지 보내기`; }
    else { const ch = channel(v.sid, v.cid); mark.textContent = '#'; $('#chanTitle').textContent = ch?.name || ''; $('#msgInput').placeholder = `#${ch?.name || ''}에 메시지 보내기`; }
  }

  function renderMe() {
    const a = $('#meAvatar');
    a.style.setProperty('--c', S.me.color);
    a.textContent = initial(S.me.nick);
    a.dataset.speak = socket.id || '';
    a.classList.toggle('speaking', S.speaking.has(socket.id));
    $('#meName').textContent = S.me.nick;
    $('#meSub').textContent = V.channel ? '음성 채널에 있음' : '@' + S.me.username;

    const mute = $('#muteBtn');
    mute.innerHTML = V.muted ? ICON.micOff : ICON.mic;
    mute.classList.toggle('off', V.muted);
    mute.setAttribute('aria-pressed', String(V.muted));
    mute.title = mute.ariaLabel = V.muted ? '마이크 켜기' : '마이크 끄기';
    const deaf = $('#deafBtn');
    deaf.innerHTML = V.deafened ? ICON.headOff : ICON.head;
    deaf.classList.toggle('off', V.deafened);
    deaf.setAttribute('aria-pressed', String(V.deafened));
    deaf.title = deaf.ariaLabel = V.deafened ? '소리 켜기' : '소리 끄기';

    $('#voicePanel').hidden = !V.channel;
    if (V.channel) $('#vpChannel').textContent = `${server(V.server)?.name || ''} / ${channel(V.server, V.channel)?.name || ''}`;
  }

  function renderMessages() {
    if (S.view.kind === 'home') return;
    const box = $('#messages');
    const key = keyOf();
    const list = S.messages.get(key);
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
    const prevTop = box.scrollTop;
    box.innerHTML = '';
    if (!list) return;
    if (!list.length) {
      const wrap = el('div', 'empty');
      wrap.appendChild(el('div', 'big-hash', S.view.kind === 'dm' ? '@' : '#'));
      wrap.appendChild(el('h2', '', S.view.kind === 'dm' ? `${nameOf(S.view.peer)}님과의 1:1 대화` : `#${channel(S.view.sid, S.view.cid)?.name || ''}에 오신 걸 환영해요`));
      wrap.appendChild(el('p', '', '아직 대화가 없어요. 첫 메시지를 남겨 보세요.'));
      box.appendChild(wrap);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((m, i) => frag.appendChild(buildMessage(m, list[i - 1])));
    box.appendChild(frag);
    box.scrollTop = nearBottom || justOpened ? box.scrollHeight : prevTop;
    justOpened = false;
  }

  function buildMessage(m, prev) {
    const frag = document.createDocumentFragment();
    if (!prev || !sameDay(prev.ts, m.ts)) frag.appendChild(el('div', 'day-divider', dayFmt.format(m.ts)));
    const grouped = prev && prev.uid === m.uid && m.ts - prev.ts < GROUP_GAP && sameDay(prev.ts, m.ts);
    const row = el('div', 'msg' + (grouped ? '' : ' head'));
    row.style.setProperty('--c', colorOf(m.uid));
    if (grouped) {
      row.appendChild(el('div', 'side-time', timeFmt.format(m.ts).replace(/^(오전|오후)\s*/, '')));
    } else {
      row.appendChild(avatarEl(m.uid));
      const meta = el('div', 'msg-meta');
      const t = el('time', 'msg-time', timeFmt.format(m.ts));
      t.dateTime = new Date(m.ts).toISOString();
      meta.append(el('span', 'msg-author', nameOf(m.uid) + (m.uid === S.me.id ? ' (나)' : '')), t);
      row.appendChild(meta);
    }
    const body = el('div', 'msg-text');
    body.innerHTML = linkify(m.text);
    row.appendChild(body);
    frag.appendChild(row);
    return frag;
  }

  function onMessage(m) {
    S.typing.get(m.key)?.delete(m.uid);
    renderTyping();
    const list = S.messages.get(m.key);
    if (list) {
      const prev = list[list.length - 1];
      list.push(m);
      if (list.length > 300) list.shift();
      if (keyOf() === m.key) {
        const box = $('#messages');
        if (box.querySelector('.empty')) { renderMessages(); return; }
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
        box.appendChild(buildMessage(m, prev));
        if (nearBottom || m.uid === S.me.id) box.scrollTop = box.scrollHeight;
        return;
      }
    }
    if (keyOf() !== m.key && m.uid !== S.me.id) {
      S.unread.add(m.key);
      renderRail(); renderSidebar();
    }
  }

  function renderTyping() {
    const t = $('#typing');
    t.innerHTML = '';
    const map = S.typing.get(keyOf());
    if (!map) return;
    const now = Date.now();
    const names = [];
    for (const [uid, until] of map) { if (until < now) map.delete(uid); else if (uid !== S.me?.id) names.push(nameOf(uid)); }
    if (!names.length) return;
    t.append(el('b', '', names.length > 3 ? `${names.length}명` : names.join(', ')), document.createTextNode('님이 입력하고 있어요…'));
  }
  setInterval(renderTyping, 1000);

  function renderMembers() {
    if (!S.me) return;
    const box = $('#memberBody');
    box.innerHTML = '';
    const v = S.view;
    const pool = v.kind === 'server' ? [...new Set(server(v.sid)?.members || [])].filter((u) => S.users.has(u)) : friends();
    const on = pool.filter((u) => S.online.has(u)).sort(byName);
    const off = pool.filter((u) => !S.online.has(u)).sort(byName);
    const section = (title, list, offline) => {
      box.appendChild(el('h2', 'cat' + (offline ? ' spaced' : ''), `${title} — ${list.length}`));
      const ul = el('ul', 'member-list');
      for (const uid of list) {
        const li = el('li', 'member' + (offline ? ' offline' : ''));
        li.appendChild(avatarEl(uid, 'md', { online: !offline }));
        const t = el('div', 'member-text');
        const n = el('div', 'member-name', nameOf(uid) + (uid === S.me.id ? ' (나)' : ''));
        n.style.color = colorOf(uid);
        t.appendChild(n);
        const vc = !offline && voiceOf(uid);
        if (vc && server(vc.server)) {
          const sub = el('div', 'member-sub');
          sub.innerHTML = ICON.speaker;
          sub.appendChild(document.createTextNode(v.kind === 'server' && vc.server === v.sid ? (channel(vc.server, vc.channel)?.name || '음성') : server(vc.server).name));
          t.appendChild(sub);
        }
        li.appendChild(t);
        ul.appendChild(li);
      }
      box.appendChild(ul);
    };
    section(v.kind === 'server' ? '온라인' : '활동 중인 친구', on, false);
    if (off.length) section('오프라인', off, true);
  }

  // ---------- 친구 화면 ----------
  function renderFriendsSafe() {
    if (document.activeElement?.id === 'friendSearch') { renderFriendResults(); return; }
    renderFriends();
  }
  let renderFriendResults = () => {};

  function personRow(uid, sub, actions) {
    const li = el('li', 'person');
    li.appendChild(avatarEl(uid, '', { online: true }));
    const t = el('div', 'person-text');
    const n = el('div', 'person-name', nameOf(uid));
    n.style.color = colorOf(uid);
    t.append(n, el('div', 'person-sub', sub));
    li.appendChild(t);
    const acts = el('div', 'person-actions');
    for (const [label, cls, fn] of actions) {
      const b = btn(label, cls, fn);
      if (!fn) b.disabled = true;
      acts.appendChild(b);
    }
    li.appendChild(acts);
    return li;
  }
  const statusText = (uid) => {
    if (!S.online.has(uid)) return '오프라인';
    const vc = voiceOf(uid);
    return vc && server(vc.server) ? `${server(vc.server).name} 음성채널에 있음` : '온라인';
  };

  function renderFriends() {
    if (!S.me) return;
    const tabs = $('#friendTabs');
    tabs.innerHTML = '';
    for (const [id, label] of [['online', '온라인'], ['all', '모든 친구'], ['pending', '대기 중'], ['add', '친구 추가']]) {
      const t = btn(label, 'tab' + (id === 'add' ? ' cta' : ''), () => { S.friendTab = id; renderFriends(); });
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', String(S.friendTab === id));
      if (id === 'pending' && pendingIn().length) t.appendChild(el('span', 'pill', String(pendingIn().length)));
      tabs.appendChild(t);
    }
    const body = $('#friendsBody');
    body.innerHTML = '';
    renderFriendResults = () => {};

    if (S.friendTab === 'online' || S.friendTab === 'all') {
      let list = friends();
      if (S.friendTab === 'online') list = list.filter((u) => S.online.has(u));
      list.sort((a, b) => (S.online.has(b) - S.online.has(a)) || byName(a, b));
      body.appendChild(el('h3', '', `${S.friendTab === 'online' ? '온라인' : '모든 친구'} — ${list.length}명`));
      if (!list.length) {
        body.appendChild(el('div', 'blank', friends().length && S.friendTab === 'online'
          ? '지금 접속한 친구가 없어요.'
          : '아직 친구가 없어요. "친구 추가" 탭에서 친구 아이디를 넣어 보세요.'));
        return;
      }
      const ul = el('ul', 'person-list');
      for (const uid of list) {
        ul.appendChild(personRow(uid, statusText(uid), [
          ['메시지', 'ghost-btn', () => go({ kind: 'dm', peer: uid })],
          ['친구 삭제', 'ghost-btn danger', () => removeFriend(uid)],
        ]));
      }
      body.appendChild(ul);
    } else if (S.friendTab === 'pending') {
      const inc = pendingIn(), out = pendingOut();
      body.appendChild(el('h3', '', `받은 요청 — ${inc.length}`));
      if (!inc.length) body.appendChild(el('p', 'lead', '받은 친구 요청이 없어요.'));
      else {
        const ul = el('ul', 'person-list');
        for (const r of inc) {
          ul.appendChild(personRow(other(r), '@' + (user(other(r))?.username || ''), [
            ['수락', 'primary-btn compact', () => respond(other(r), true)],
            ['거절', 'ghost-btn', () => respond(other(r), false)],
          ]));
        }
        body.appendChild(ul);
      }
      const h = el('h3', '', `보낸 요청 — ${out.length}`);
      h.style.marginTop = '22px';
      body.appendChild(h);
      if (!out.length) body.appendChild(el('p', 'lead', '보낸 친구 요청이 없어요.'));
      else {
        const ul = el('ul', 'person-list');
        for (const r of out) ul.appendChild(personRow(other(r), '수락을 기다리는 중', [['요청 취소', 'ghost-btn', () => removeFriend(other(r), true)]]));
        body.appendChild(ul);
      }
    } else {
      body.appendChild(el('h3', '', '친구 추가'));
      body.appendChild(el('p', 'lead', '친구의 아이디를 넣거나, 아래 목록에서 찾아 친구 요청을 보내요. 내 아이디를 친구에게 알려줘도 돼요.'));
      const mine = el('div', 'my-id');
      mine.append(document.createTextNode('내 아이디'), el('code', '', '@' + S.me.username));
      body.appendChild(mine);

      const form = el('form', 'search-row');
      const inp = el('input', 'text-input');
      inp.id = 'friendSearch';
      inp.placeholder = '친구 아이디 또는 닉네임';
      inp.autocomplete = 'off';
      inp.autocapitalize = 'none';
      inp.value = S.search;
      const sendBtn = el('button', 'primary-btn compact', '친구 요청');
      sendBtn.type = 'submit';
      form.append(inp, sendBtn);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = inp.value.trim();
        if (!q) return;
        const match = [...S.users.values()].find((u) => u.username === q.toLowerCase().replace(/^@/, '')) ||
          [...S.users.values()].filter((u) => u.nick === q && u.id !== S.me.id).sort().at(0);
        sendRequest(match ? match.username : q);
      });
      body.appendChild(form);
      const results = el('ul', 'person-list');
      body.appendChild(results);
      inp.addEventListener('input', () => { S.search = inp.value; renderFriendResults(); });

      renderFriendResults = () => {
        results.innerHTML = '';
        const q = S.search.trim().toLowerCase().replace(/^@/, '');
        if (!q) {
          // 같은 서버에 있는 사람 중 친구가 아닌 사람을 추천
          const known = new Set();
          for (const s of S.servers.values()) if (s.id !== HOME) s.members.forEach((u) => known.add(u));
          const sugg = [...known].filter((u) => u !== S.me.id && relation(u) === 'none' && S.users.has(u)).sort(byName).slice(0, 20);
          if (!sugg.length) return;
          const h = el('h3', '', '같은 서버에 있는 사람');
          h.style.marginTop = '10px';
          results.appendChild(h);
          for (const uid of sugg) results.appendChild(resultRow(uid));
          return;
        }
        const people = [...S.users.values()]
          .filter((u) => u.id !== S.me.id && (u.username.includes(q) || u.nick.toLowerCase().includes(q)))
          .sort((a, b) => (S.online.has(b.id) - S.online.has(a.id)) || byName(a.id, b.id))
          .slice(0, 30);
        if (!people.length) { results.appendChild(el('div', 'blank', '그런 아이디나 닉네임을 쓰는 사람이 없어요.')); return; }
        for (const u of people) results.appendChild(resultRow(u.id));
      };
      const resultRow = (uid) => {
        const rel = relation(uid);
        const acts = rel === 'friend' ? [['메시지', 'ghost-btn', () => go({ kind: 'dm', peer: uid })]]
          : rel === 'sent' ? [['요청 보냄', 'ghost-btn', null]]
          : rel === 'received' ? [['수락', 'primary-btn compact', () => respond(uid, true)]]
          : [['친구 요청', 'primary-btn compact', () => sendRequest(user(uid).username)]];
        return personRow(uid, '@' + user(uid).username + ' · ' + (S.online.has(uid) ? '온라인' : '오프라인'), acts);
      };
      renderFriendResults();
    }
  }

  function sendRequest(username) {
    socket.emit('friend-request', username, (res) => {
      if (res.error) { toast(res.error); return; }
      toast(res.status === 'friends' ? `${res.user.nick}님과 친구가 됐어요.` : `${res.user.nick}님에게 친구 요청을 보냈어요.`);
      S.search = '';
      renderFriends();
    });
  }
  function respond(uid, accept) {
    socket.emit('friend-respond', { uid, accept }, (res) => {
      if (res.error) toast(res.error);
      else if (accept) toast(`${nameOf(uid)}님과 친구가 됐어요.`);
    });
  }
  const confirmRemove = new Set();
  function removeFriend(uid, isCancel = false) {
    if (!isCancel && !confirmRemove.has(uid)) {
      confirmRemove.add(uid);
      toast(`한 번 더 누르면 ${nameOf(uid)}님을 친구에서 삭제해요.`);
      setTimeout(() => confirmRemove.delete(uid), 4000);
      return;
    }
    confirmRemove.delete(uid);
    socket.emit('friend-remove', uid, (res) => { if (res.error) toast(res.error); });
  }

  // ---------- 메시지 보내기 ----------
  const input = $('#msgInput');
  let lastTypingSent = 0;
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; };
  const updateSend = () => { $('#sendBtn').disabled = !input.value.trim(); };
  input.addEventListener('input', () => {
    autosize(); updateSend();
    const key = keyOf();
    const now = Date.now();
    if (key && input.value.trim() && now - lastTypingSent > 2000) { lastTypingSent = now; socket.emit('typing', key); }
  });
  input.addEventListener('keydown', (e) => {
    // 한글 조합 중 Enter는 무시 (마지막 글자가 두 번 가지 않게)
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); sendMessage(); }
  });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  function sendMessage() {
    const text = input.value.trim();
    const key = keyOf();
    if (!text || !key) return;
    if (!socket.connected) { toast('서버와 연결이 끊겨 있어서 보낼 수 없어요.'); return; }
    socket.emit('message', { key, text });
    input.value = '';
    lastTypingSent = 0;
    autosize(); updateSend();
  }

  // ---------- 서버 만들기 / 참가 ----------
  let serverColor = COLORS[0];
  const drawServerSw = swatches($('#serverSwatches'), () => serverColor, (c) => { serverColor = c; });
  function openServerModal() {
    serverColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    drawServerSw();
    $('#serverNameInput').value = '';
    $('#joinCodeInput').value = '';
    $('#serverModal').hidden = false;
    closeDrawers();
    setTimeout(() => $('#serverNameInput').focus(), 30);
  }
  $('#createServerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    socket.emit('create-server', { name: $('#serverNameInput').value, color: serverColor }, (res) => {
      if (res.error) { toast(res.error); return; }
      S.servers.set(res.server.id, res.server);
      $('#serverModal').hidden = true;
      go({ kind: 'server', sid: res.server.id, cid: 'general' });
      toast(`"${res.server.name}" 서버를 만들었어요. 톱니바퀴 버튼에서 친구를 초대해 보세요.`);
    });
  });
  $('#joinServerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#joinCodeInput').value.trim();
    if (!code) return;
    socket.emit('join-server', code, (res) => {
      if (res.error) { toast(res.error); return; }
      S.servers.set(res.server.id, res.server);
      $('#serverModal').hidden = true;
      go({ kind: 'server', sid: res.server.id, cid: firstText(res.server.id) });
      toast(`"${res.server.name}" 서버에 들어왔어요.`);
    });
  });

  // ---------- 서버 설정 ----------
  let confirmAction = null;
  function renderSettings() {
    if (S.view.kind !== 'server' || S.view.sid === HOME) { $('#settingsModal').hidden = true; return; }
    const s = server(S.view.sid);
    $('#settingsTitle').textContent = `${s.name} 설정`;
    $('#inviteCode').textContent = s.id;
    const ul = $('#inviteList');
    ul.innerHTML = '';
    const cands = friends().filter((u) => !s.members.includes(u)).sort(byName);
    if (!cands.length) ul.appendChild(el('p', 'small', friends().length ? '친구가 모두 이 서버에 있어요.' : '친구를 추가하면 여기서 바로 초대할 수 있어요.'));
    for (const uid of cands) {
      ul.appendChild(personRow(uid, S.online.has(uid) ? '온라인' : '오프라인', [['초대', 'primary-btn compact', () => {
        socket.emit('invite-to-server', { sid: s.id, uid }, (res) => toast(res.error || `${nameOf(uid)}님을 초대했어요.`));
      }]]));
    }
    $('#deleteServerBtn').hidden = s.owner !== S.me.id;
    $('#confirmText').hidden = true;
    confirmAction = null;
  }
  $('#serverSettingsBtn').onclick = () => { renderSettings(); $('#settingsModal').hidden = false; closeDrawers(); };
  $('#copyCodeBtn').onclick = () => {
    const code = $('#inviteCode').textContent;
    const fallback = () => {
      const r = document.createRange();
      r.selectNodeContents($('#inviteCode'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      toast('코드를 선택해 뒀어요. Ctrl+C로 복사해 주세요.');
    };
    try { navigator.clipboard.writeText(code).then(() => toast('초대 코드를 복사했어요.'), fallback); } catch { fallback(); }
  };
  function askConfirm(text, key, fn) {
    if (confirmAction === key) { confirmAction = null; $('#confirmText').hidden = true; fn(); return; }
    confirmAction = key;
    $('#confirmText').textContent = text;
    $('#confirmText').hidden = false;
  }
  $('#leaveServerBtn').onclick = () => askConfirm('한 번 더 누르면 서버에서 나가요.', 'leave', () => {
    socket.emit('leave-server', S.view.sid, (res) => { if (res.error) toast(res.error); });
  });
  $('#deleteServerBtn').onclick = () => askConfirm('한 번 더 누르면 서버가 모든 사람에게서 사라져요. 메시지도 지워져요.', 'delete', () => {
    socket.emit('delete-server', S.view.sid, (res) => { if (res.error) toast(res.error); });
  });

  // ---------- 내 프로필 ----------
  let profileColor = COLORS[0];
  const drawProfileSw = swatches($('#profileSwatches'), () => profileColor, (c) => { profileColor = c; });
  $('#profileBtn').onclick = () => {
    profileColor = S.me.color;
    drawProfileSw();
    $('#profileNick').value = S.me.nick;
    $('#profileId').textContent = `아이디 @${S.me.username} · 친구는 이 아이디로 나를 추가할 수 있어요.`;
    $('#profileModal').hidden = false;
  };
  $('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    socket.emit('profile', { nick: $('#profileNick').value, color: profileColor }, (res) => {
      if (res.error) { toast(res.error); return; }
      $('#profileModal').hidden = true;
    });
  });
  $('#logoutBtn').onclick = () => {
    if (V.channel) leaveVoice();
    socket.emit('logout', local.get('ajit-token', ''));
    local.del('ajit-token');
    setTimeout(() => location.reload(), 150);
  };

  // 모달 닫기
  document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { b.closest('.modal-wrap').hidden = true; }; });
  document.querySelectorAll('.modal-wrap').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));

  // ---------- 음성채널 ----------
  async function joinVoice(sid, cid) {
    if (V.server === sid && V.channel === cid) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast('이 주소에서는 마이크를 쓸 수 없어요. https:// 주소나 localhost로 접속해야 해요.', 6500);
      return;
    }
    if (V.channel) leaveVoice();
    try {
      V.ctx = V.ctx || new (window.AudioContext || window.webkitAudioContext)();
      V.ctx.resume?.();
    } catch { V.ctx = null; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      toast(err?.name === 'NotAllowedError'
        ? '마이크 권한이 거부됐어요. 주소창 왼쪽 아이콘에서 마이크를 허용해 주세요.'
        : '마이크를 찾지 못했어요. 마이크가 연결돼 있는지 확인해 주세요.', 6500);
      return;
    }
    V.stream = stream;
    applyMute();
    startMeter();
    socket.emit('voice-join', { server: sid, channel: cid, muted: V.muted, deafened: V.deafened }, (res) => {
      if (res.error) { toast(res.error); teardownVoice(); return; }
      V.server = sid;
      V.channel = cid;
      res.peers.forEach((id) => makePeer(id, true));
      renderMe(); renderSidebar();
    });
  }

  function leaveVoice() {
    if (!V.channel) return;
    socket.emit('voice-leave');
    teardownVoice();
  }

  function teardownVoice() {
    for (const id of [...V.peers.keys()]) closePeer(id);
    V.stream?.getTracks().forEach((t) => t.stop());
    V.stream = null;
    clearInterval(V.meterTimer);
    V.meterTimer = null;
    try { V.meterSrc?.disconnect(); } catch { /* 무시 */ }
    V.meterSrc = null;
    V.speaking = false;
    V.server = null;
    V.channel = null;
    if (S.me) { renderMe(); renderSidebar(); }
  }

  function makePeer(id, initiator) {
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.muted = V.deafened;
    $('#audioBin').appendChild(audio);
    const peer = { pc, audio, pending: [], queue: Promise.resolve() };
    V.peers.set(id, peer);

    V.stream.getTracks().forEach((t) => pc.addTrack(t, V.stream));
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('signal', { to: id, data: { candidate: e.candidate } }); };
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        const who = nameOf(S.voice.find((v) => v.sid === id)?.uid) || '상대';
        toast(`${who}님과 음성 연결이 안 돼요. 학교·기숙사 와이파이가 막고 있을 수 있어요. 휴대폰 데이터로 시도해 보세요.`, 7000);
      }
    };
    if (initiator) {
      peer.queue = peer.queue.then(async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { to: id, data: { sdp: pc.localDescription } });
      }).catch((e) => console.error('offer 실패', e));
    }
    return peer;
  }

  function onSignal({ from, data }) {
    if (!V.channel || !V.stream || !data) return;
    const peer = V.peers.get(from) || makePeer(from, false);
    const pc = peer.pc;
    peer.queue = peer.queue.then(async () => {
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
        }
        for (const c of peer.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
        else peer.pending.push(data.candidate);
      }
    }).catch((e) => console.error('signal 처리 실패', e));
  }

  function closePeer(id) {
    const peer = V.peers.get(id);
    if (!peer) return;
    try { peer.pc.close(); } catch { /* 무시 */ }
    peer.audio.srcObject = null;
    peer.audio.remove();
    V.peers.delete(id);
  }

  function applyMute() {
    const silent = V.muted || V.deafened;
    V.stream?.getAudioTracks().forEach((t) => { t.enabled = !silent; });
    for (const p of V.peers.values()) p.audio.muted = V.deafened;
  }

  function startMeter() {
    if (!V.ctx || !V.stream) return;
    const src = V.ctx.createMediaStreamSource(V.stream);
    const an = V.ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    V.meterSrc = src;
    const buf = new Uint8Array(an.fftSize);
    let lastLoud = 0;
    V.meterTimer = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x; }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (rms > 0.035 && !V.muted && !V.deafened) lastLoud = now;
      const on = now - lastLoud < 300;
      if (on !== V.speaking) { V.speaking = on; socket.emit('speaking', on); }
    }, 80);
  }

  function setSpeaking(sid, on) {
    if (on) S.speaking.add(sid); else S.speaking.delete(sid);
    document.querySelectorAll(`[data-speak="${CSS.escape(sid)}"]`).forEach((n) => n.classList.toggle('speaking', on));
  }

  $('#muteBtn').onclick = () => {
    V.muted = !V.muted;
    if (!V.muted && V.deafened) V.deafened = false;
    applyMute();
    socket.emit('voice-state', { muted: V.muted, deafened: V.deafened });
    renderMe();
  };
  $('#deafBtn').onclick = () => {
    V.deafened = !V.deafened;
    applyMute();
    socket.emit('voice-state', { muted: V.muted, deafened: V.deafened });
    renderMe();
  };
  $('#leaveVoiceBtn').onclick = leaveVoice;

  // ---------- 서랍 ----------
  const app = $('#app');
  $('#menuBtn').onclick = () => app.classList.add('nav-open');
  $('#membersBtn').onclick = () => {
    if (matchMedia('(max-width: 1060px)').matches) app.classList.toggle('members-open');
    else app.classList.toggle('hide-members');
  };
  $('#scrim').onclick = closeDrawers;
  function closeDrawers() { app.classList.remove('nav-open', 'members-open'); }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeDrawers();
    document.querySelectorAll('.modal-wrap').forEach((m) => { m.hidden = true; });
  });
  updateSend();

  window.addEventListener('beforeunload', () => { if (V.channel) socket.emit('voice-leave'); });
})();
