(function(){
const L = window.LOGIC, A = window.ART, SC = window.SCENES, AU = window.AUDIO, INK = "#15131F";
const $ = s => document.querySelector(s);
const stage = $("#stage");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = { get(k,d){ try{ const v = localStorage.getItem(k); return v===null ? d : v; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };

let myId = store.get("pd_id", null);
if(!myId){ myId = "p-" + Math.random().toString(36).slice(2,10); store.set("pd_id", myId); }
let myName = store.get("pd_name", ""), myAv = parseInt(store.get("pd_av", "0")) || 0;
const params = new URLSearchParams(location.search);
let urlCode = (params.get("salle") || "").toUpperCase().replace(/[^A-Z]/g,"").slice(0,4);

let S = null, role = null, peer = null, conns = {}, hostConn = null, localDeadline = null, hostLoop = null;
let lastSig = null, lastKey = "", modal = null, connecting = false;
const myAnswers = {};
const PREFIX = "lepireduo-v1-";
const LOCAL = params.get("local") === "1";
const PEER_OPTS = LOCAL ? {host: location.hostname, port: 9000, path: "/", secure: false} : {};
const roomQuery = code => "?salle=" + code + (LOCAL ? "&local=1" : "");

/* ---------- Mise à l'échelle ---------- */
function fit(){
  const s = Math.min(innerWidth/1280, innerHeight/720);
  stage.style.transform = `scale(${s})`;
  stage.style.left = ((innerWidth - 1280*s)/2) + "px";
  stage.style.top = ((innerHeight - 720*s)/2) + "px";
}
addEventListener("resize", fit); fit();

function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("on"), 3200); }

/* ---------- Réseau (PeerJS, l'hôte fait serveur) ---------- */
function genCode(){ const a = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let c=""; for(let i=0;i<4;i++) c += a[Math.floor(Math.random()*a.length)]; return c; }

function createRoom(){
  if(connecting) return; connecting = true; renderHome();
  const code = genCode();
  peer = new Peer(PREFIX + code, PEER_OPTS);
  peer.on("open", () => {
    connecting = false; role = "host";
    S = L.createState(code, myId);
    L.addPlayer(S, myId, myName, myAv);
    history.replaceState(null, "", roomQuery(code));
    hostLoop = setInterval(() => { if(L.tick(S, Date.now())) changed(); }, 250);
    changed();
  });
  peer.on("connection", c => {
    c.on("data", d => onHostData(c, d));
    c.on("close", () => {
      const id = c._pid; if(!id || conns[id] !== c) return;
      delete conns[id];
      if(S.players[id]){ if(S.phase==="lobby") L.removePlayer(S, id); else S.players[id].online = false; }
      changed();
    });
  });
  peer.on("error", e => {
    if(e.type === "unavailable-id"){ peer.destroy(); connecting = false; return createRoom(); }
    if(role !== "host"){ connecting = false; toast("Impossible de créer la salle (" + e.type + ")"); renderHome(); }
  });
  peer.on("disconnected", () => { try{ peer.reconnect(); }catch(e){} });
}

function onHostData(c, d){
  if(!d || typeof d !== "object") return;
  if(d.t === "join"){
    const id = String(d.id || "").slice(0,40); if(!id) return;
    if(S.phase !== "lobby" && !S.players[id]){ c.send({t:"full"}); setTimeout(()=>c.close(), 500); return; }
    if(Object.keys(S.players).length >= 12 && !S.players[id]){ c.send({t:"full"}); return; }
    if(conns[id] && conns[id] !== c){ try{ conns[id].close(); }catch(e){} }
    c._pid = id; conns[id] = c;
    L.addPlayer(S, id, d.name, d.av);
    changed();
  } else if(d.t === "act" && c._pid && d.a && typeof d.a === "object"){
    if(L.reduce(S, d.a, c._pid, Date.now())) changed();
  }
}

function broadcast(){
  let s = S;
  if(S.phase === "interro"){
    const hide = new Set(); for(let q=0;q<10;q++) hide.add(S.round+"-"+q);
    const answers = {}; for(const k in S.answers) if(!hide.has(k)) answers[k] = S.answers[k];
    s = Object.assign({}, S, {answers});
  }
  const msg = {t:"state", s, sent:Date.now()};
  for(const id in conns){ const c = conns[id]; if(c.open){ try{ c.send(msg); }catch(e){} } }
}
function changed(){ broadcast(); applyState(S, S.deadline ? S.deadline - Date.now() : null); }

function joinRoom(code){
  if(connecting) return; connecting = true; renderHome();
  peer = new Peer(undefined, PEER_OPTS);
  const fail = (msg) => { connecting = false; toast(msg); try{ peer.destroy(); }catch(e){} peer = null; renderHome(); };
  const timeout = setTimeout(() => { if(!S) fail("Salle introuvable. Vérifie le code."); }, 12000);
  peer.on("open", () => {
    hostConn = peer.connect(PREFIX + code, {reliable:true});
    hostConn.on("open", () => { role = "client"; hostConn.send({t:"join", id:myId, name:myName, av:myAv}); });
    hostConn.on("data", d => {
      if(d.t === "state"){ clearTimeout(timeout); connecting = false; if(!S) history.replaceState(null,"",roomQuery(code)); applyState(d.s, d.s.deadline ? d.s.deadline - d.sent : null); }
      else if(d.t === "full"){ clearTimeout(timeout); fail("La partie a déjà commencé dans cette salle."); }
    });
    hostConn.on("close", () => { if(S) showModal("hostgone"); });
  });
  peer.on("error", e => { clearTimeout(timeout); if(e.type === "peer-unavailable") fail("Aucune salle avec le code " + code + "."); else if(!S) fail("Connexion impossible (" + e.type + ")."); });
}

function act(a){
  AU.unlock();
  if(role === "host"){ if(L.reduce(S, a, myId, Date.now())) changed(); }
  else if(hostConn && hostConn.open) hostConn.send({t:"act", a});
}

/* ---------- Application de l'état + sons ---------- */
function sig(s){
  return { phase:s.phase, turn:s.turn, q:s.q, round:s.round, ridx:s.ridx, n:Object.keys(s.players).length,
           signed:Object.keys(s.signed||{}).length, ov:JSON.stringify(s.overrides||{}) };
}
function applyState(s, rem){
  const prev = lastSig; S = s; localDeadline = rem!=null ? Date.now() + rem : null;
  const now = sig(S); lastSig = now;
  render();
  if(!prev) return;
  if(now.n > prev.n) AU.sfx("join");
  if(now.phase !== prev.phase){
    if(now.phase === "dossier") AU.sfx("paper");
    if(now.phase === "roundEnd") AU.sfx("win");
    if(now.phase === "verdict"){ setTimeout(()=>AU.sfx("slam"), 150); setTimeout(()=>AU.sfx("siren"), 700); setTimeout(()=>AU.speak(S.loser==="both" ? "Égalité. Tout le monde en cellule." : "Coupables ! Embarquez-moi ces deux-là."), 1400); }
  }
  if(now.phase === "interro" && (now.phase !== prev.phase || now.q !== prev.q || now.turn !== prev.turn)){ AU.sfx("ding"); speakQuestion(); }
  if(now.phase === "interro" && now.signed > prev.signed && now.q === prev.q) AU.sfx("type");
  if(now.phase === "reveal" && (now.phase !== prev.phase || now.turn !== prev.turn || now.ridx !== prev.ridx || now.ov !== prev.ov)){
    const {q, duo} = L.stepInfo(S.ridx, S); const ok = L.matchOf(S, S.round, q, duo);
    setTimeout(() => AU.sfx(ok ? "match" : "fail"), now.ov !== prev.ov && now.ridx === prev.ridx ? 50 : 520);
  }
}

/* ---------- Helpers ---------- */
const me = () => S && S.players[myId];
const isHost = () => role === "host";
function namesFor(duo){ return L.duoNames(S, duo || "A"); }
function myDuo(){ const p = me(); return (p && p.duo) || "A"; }
function questionText(r, q, duo){ const sc = L.scenOf(S, r, duo); return sc ? L.fmt(sc.questions[q], namesFor(duo)) : ""; }
function speakQuestion(){ const t = questionText(S.round, S.q, S.turn); setTimeout(()=>AU.speak(t), 350); }
function remaining(){ return localDeadline ? Math.max(0, localDeadline - Date.now()) : 0; }
function fmtTime(ms){ const s = Math.ceil(ms/1000); return s >= 60 ? Math.floor(s/60) + ":" + String(s%60).padStart(2,"0") : String(s); }
function portrait(p, expr, w=148, h=146){ return A.portrait(p ? p.av : 0, expr, w, h); }
function link(){ return location.origin + location.pathname + roomQuery(S.code); }

/* ---------- Rendu ---------- */
function render(){
  if(!S){ renderHome(); return; }
  const key = S.phase === "interro" ? "i" + S.round + S.turn + "-" + S.q : null;
  if(key && key === lastKey){ patchInterro(); return; }
  lastKey = key || "";
  const fn = { lobby:renderLobby, dossier:renderDossier, interro:renderInterro, reveal:renderReveal, roundEnd:renderRoundEnd, verdict:renderVerdict }[S.phase];
  stage.innerHTML = fn() + SC.grainLayer("g" + S.phase) + modalHtml() + `<div id="toast"></div>`;
  if(S.phase === "interro"){ const inp = $("#answer"); if(inp && !S.signed[myId]) setTimeout(()=>inp.focus(), 50); }
  tickTimers(true);
}

/* Accueil */
function renderHome(){
  const avs = A.AVATARS.map(a => `<button type="button" data-act="av" data-v="${a.id}" aria-label="${a.nom}" style="width:100%;height:84px;padding:0;border:4px solid ${INK};border-radius:12px;background:${a.id===myAv?"#FFC23D":"#E9DFCB"};box-shadow:${a.id===myAv?"0 0 0 4px #FFC23D, 0 5px 0 "+INK:"0 5px 0 "+INK};overflow:hidden;display:flex;align-items:flex-end;justify-content:center;transform:${a.id===myAv?"translateY(-4px)":"none"}">${A.portrait(a.id, a.id===myAv?"happy":"neutral", 74, 80)}</button>`).join("");
  stage.innerHTML = SC.precinct(false) + SC.title(true) + `
  <div class="popIn" style="position:absolute;left:290px;top:186px;width:700px;background:#FFF8EA;border:6px solid ${INK};border-radius:22px;box-shadow:0 10px 0 ${INK},0 30px 60px rgba(0,0,0,.5);padding:22px 30px 26px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="typew" style="font-size:15px;color:#6B6355">FICHE D'IDENTITÉ · SUSPECT</div>
      <div class="lil" style="font-size:20px;color:#D7262E;border:4px solid #D7262E;border-radius:8px;padding:0 10px;transform:rotate(6deg)">À COMPLÉTER</div>
    </div>
    <label for="nm" style="font-weight:900;font-size:14px;letter-spacing:2px">TON NOM DE CODE</label>
    <input id="nm" class="input" maxlength="16" placeholder="Ex : Camille" value="${esc(myName)}" autocomplete="off">
    <div style="font-weight:900;font-size:14px;letter-spacing:2px">TA TÊTE DE SUSPECT</div>
    <div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px">${avs}</div>
    <div style="display:flex;gap:16px;align-items:stretch;margin-top:6px">
      ${urlCode ? `
        <button class="btn red" data-act="join" style="flex:1;font-size:26px"${connecting?" disabled":""}><span class="shine"></span><span class="t">${connecting?"CONNEXION…":"REJOINDRE LA SALLE "+esc(urlCode)}</span></button>
        <button class="btn cream small" data-act="forget" style="font-size:15px">Autre salle</button>` : `
        <button class="btn red" data-act="create" style="flex:1.1;font-size:24px"${connecting?" disabled":""}><span class="shine"></span><span class="t">${connecting?"OUVERTURE…":"CRÉER UNE SALLE"}</span></button>
        <div style="flex:1;display:flex;gap:8px">
          <input id="code" class="input" maxlength="4" placeholder="CODE" aria-label="Code de la salle" style="text-transform:uppercase;letter-spacing:6px;text-align:center;font-size:24px;padding:8px">
          <button class="btn" data-act="join" style="font-size:20px;padding:8px 16px"${connecting?" disabled":""}>GO</button>
        </div>`}
    </div>
  </div>` + SC.tape() + SC.grainLayer("gh") + `<div id="toast"></div>`;
}

/* Lobby */
const SLOTS = [{duo:"A",slot:0,x:238,y:282,r:-5},{duo:"A",slot:1,x:432,y:300,r:4},{duo:"B",slot:0,x:680,y:302,r:-3},{duo:"B",slot:1,x:872,y:284,r:5}];
function renderLobby(){
  const seatOf = (d,s) => L.seated(S).find(p => p.duo===d && p.slot===s);
  const pol = SLOTS.map(sl => {
    const p = seatOf(sl.duo, sl.slot);
    if(p){
      const mine = p.id === myId;
      return `<div class="polaroid" style="left:${sl.x}px;top:${sl.y}px;transform:rotate(${sl.r}deg)${mine?";box-shadow:0 0 0 5px #FFC23D,6px 8px 0 rgba(5,8,15,.55)":""}">
        <div class="ph ${sl.duo}">${portrait(p, mine?"happy":"neutral")}</div>
        <div class="nm">${esc(p.name)}${p.bot?" (bot)":""}</div>
        ${mine ? `<div class="lil" style="position:absolute;top:-16px;right:-14px;background:#FFC23D;border:3px solid ${INK};border-radius:8px;padding:0 8px;font-size:15px;transform:rotate(8deg)">TOI</div>` : ""}
        ${isHost() && !mine ? `<button type="button" data-act="kick" data-id="${esc(p.id)}" aria-label="Retirer ${esc(p.name)}" style="position:absolute;top:-14px;left:-14px;width:30px;height:30px;border-radius:50%;border:3px solid ${INK};background:#FF5A5F;color:#FFF;font-weight:900">×</button>` : ""}
        ${!p.online && !p.bot ? `<div class="lil" style="position:absolute;inset:40% 10px auto;background:#15131F;color:#FFF;text-align:center;border-radius:8px">HORS LIGNE</div>` : ""}
      </div>`;
    }
    return `<div class="polaroid" style="left:${sl.x}px;top:${sl.y}px;transform:rotate(${sl.r}deg);border-style:dashed;opacity:.95">
      <div class="ph E" style="align-items:center;flex-direction:column;justify-content:center;gap:8px">
        <button class="btn small ${sl.duo==="A"?"":"red"}" data-act="slot" data-duo="${sl.duo}" data-slot="${sl.slot}" style="font-size:15px">M'ASSEOIR ICI</button>
        ${isHost() ? `<button class="btn small cream" data-act="bot" data-duo="${sl.duo}" data-slot="${sl.slot}" style="font-size:13px">+ BOT DE TEST</button>` : ""}
      </div>
      <div class="nm" style="color:#6B6355">Place libre</div></div>`;
  }).join("");
  const a0 = seatOf("A",0), a1 = seatOf("A",1), b0 = seatOf("B",0), b1 = seatOf("B",1);
  const full = a0 && a1 && b0 && b1;
  const standing = S.order.map(id => S.players[id]).filter(p => p && !p.duo);
  const strings = `<svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true">
    ${a0&&a1 ? `<path d="M318 288 Q420 340 516 304" stroke="#D7262E" stroke-width="4" fill="none"/><path d="M318 288 Q420 340 516 304" stroke="#FF6B6B" stroke-width="1.5" fill="none"/>` : ""}
    ${b0&&b1 ? `<path d="M764 306 Q860 352 958 290" stroke="#D7262E" stroke-width="4" fill="none"/><path d="M764 306 Q860 352 958 290" stroke="#FF6B6B" stroke-width="1.5" fill="none"/>` : ""}
    <g stroke="${INK}" stroke-width="3"><circle cx="318" cy="286" r="10" fill="#2F5DA8"/><circle cx="516" cy="302" r="10" fill="#2F5DA8"/><circle cx="764" cy="304" r="10" fill="#FF5A5F"/><circle cx="958" cy="288" r="10" fill="#FF5A5F"/></g>
    <g transform="translate(640 400) rotate(-12)"><circle r="44" fill="#FF5A5F" stroke="${INK}" stroke-width="6"/><circle r="34" fill="none" stroke="#FFF8EA" stroke-width="3" stroke-dasharray="6 5"/><text y="14" text-anchor="middle" font-family="Lilita One" font-size="40" fill="#FFF8EA">VS</text></g>
    ${a0&&a1 ? `<g transform="translate(360 500) rotate(-8)"><rect x="-50" y="-22" width="100" height="40" rx="8" fill="none" stroke="#2EA35A" stroke-width="5"/><text y="10" text-anchor="middle" font-family="Lilita One" font-size="26" fill="#2EA35A">PRÊTS</text></g>` : ""}
    ${b0&&b1 ? `<g transform="translate(905 506) rotate(7)"><rect x="-50" y="-22" width="100" height="40" rx="8" fill="none" stroke="#2EA35A" stroke-width="5"/><text y="10" text-anchor="middle" font-family="Lilita One" font-size="26" fill="#2EA35A">PRÊTS</text></g>` : ""}
  </svg>`;
  return SC.precinct(true) + SC.title(false) + pol + strings + `
    <div class="marker" style="position:absolute;left:248px;top:236px;font-size:24px;background:#9FD3FF;border:3px solid ${INK};padding:2px 14px;transform:rotate(-3deg);box-shadow:3px 4px 0 rgba(5,8,15,.4)">DUO A</div>
    <div class="marker" style="position:absolute;left:920px;top:236px;font-size:24px;background:#FFB3AE;border:3px solid ${INK};padding:2px 14px;transform:rotate(4deg);box-shadow:3px 4px 0 rgba(5,8,15,.4)">DUO B</div>
    ${standing.length ? `<div style="position:absolute;left:20px;top:150px;display:flex;flex-direction:column;gap:6px;max-width:200px"><div class="lil" style="color:#FFC23D;font-size:15px">AU POSTE, PAS ASSIS :</div>${standing.map(p=>`<div class="chip"><div class="dot">${A.portrait(p.av,"neutral",30,30)}</div>${esc(p.name)}</div>`).join("")}</div>` : ""}
    ${me() && me().duo ? `<button class="btn small cream" data-act="stand" style="position:absolute;right:24px;top:170px;font-size:14px">Changer de place</button>` : ""}
    ${SC.tape()}
    <div style="position:absolute;left:0;right:0;bottom:30px;display:flex;justify-content:center;align-items:center;gap:30px">
      <div style="display:flex;align-items:center;transform:rotate(-2deg)">
        <div style="position:relative;background:#FFF8EA;border:5px solid ${INK};border-radius:6px 18px 18px 6px;padding:8px 18px 8px 34px;box-shadow:6px 6px 0 #05080F;display:flex;align-items:center;gap:14px">
          <div style="position:absolute;left:10px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:#16213A;border:3px solid ${INK}"></div>
          <div style="display:flex;flex-direction:column"><div style="font-weight:900;font-size:12px;letter-spacing:2px;color:#6B6355">PIÈCE À CONVICTION · SALLE</div><div class="typew" style="font-size:40px;letter-spacing:10px;line-height:1.1">${esc(S.code)}</div></div>
          <button class="btn small yellow" data-act="copy" style="font-size:14px">COPIER LE LIEN</button>
        </div>
      </div>
      ${isHost()
        ? `<button class="btn red" data-act="start" style="font-size:34px;padding:14px 40px"${full?"":" disabled"}><span class="shine"></span><span class="t">${full?"OUVRIR L'ENQUÊTE":"IL FAUT 4 SUSPECTS"}</span></button>`
        : `<div class="lil" style="font-size:24px;color:#FFF8EA;background:rgba(5,8,15,.6);border:4px solid ${INK};border-radius:16px;padding:14px 22px">${full?"L'hôte va ouvrir l'enquête…":"En attente de 4 suspects…"}</div>`}
    </div>`;
}

/* Dossier */
function renderDossier(){
  const duo = S.turn, names = namesFor(duo), sc = L.scenOf(S, S.round, duo);
  const p = me(), playing = p && p.duo === duo, ready = playing && p.ready;
  const partner = L.members(S, duo).find(x => x.id !== myId);
  const f = t => esc(L.fmt(t, names));
  const readyDots = L.members(S, duo).map(x => `<div title="${esc(x.name)}" style="width:38px;height:38px;border-radius:50%;border:3px solid ${INK};overflow:hidden;background:${x.ready?"#6FD6B8":"#E9DFCB"};position:relative">${A.portrait(x.av, x.ready?"happy":"neutral", 38, 38)}${x.ready?`<div style="position:absolute;right:-2px;bottom:-2px;width:16px;height:16px;border-radius:50%;background:#2EA35A;border:2px solid ${INK}"></div>`:""}</div>`).join("");
  const facts = sc.faits.map((t,i)=>`<div style="display:flex;gap:10px;align-items:flex-start;border-bottom:2px dashed #D9CBAE;padding:5px 0">
      <div class="lil" style="flex:none;width:26px;height:26px;border-radius:50%;background:${duo==="A"?"#2F5DA8":"#FF5A5F"};color:#FFF8EA;border:3px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:14px">${i+1}</div>
      <div class="typew" style="font-size:16px;line-height:1.3">${f(t)}</div></div>`).join("");
  return SC.desk() + `
  ${SC.deskLight()}
  <div class="lil" style="position:absolute;left:318px;top:66px;width:150px;text-align:center;font-size:20px;letter-spacing:1px">MANCHE ${S.round+1} / 3</div>
  <div class="fadeIn" style="position:absolute;left:236px;top:116px;width:352px;display:flex;flex-direction:column;gap:8px">
    <div class="typew" style="font-size:14px;color:#6B6355">AFFAIRE N° ${String(47+S.round*2+(duo==="B"?1:0)).padStart(3,"0")} · ${esc(sc.heure.toUpperCase())}</div>
    <h1 class="lil" style="margin:0;font-size:40px;line-height:1;color:#16213A">${esc(sc.titre)}</h1>
    <div style="display:flex;align-items:center;gap:8px"><div class="lil" style="font-size:16px;background:${duo==="A"?"#9FD3FF":"#FFB3AE"};border:3px solid ${INK};border-radius:8px;padding:0 10px">SUSPECTS · DUO ${duo}</div><div class="marker" style="font-size:17px">${esc(names.A)} & ${esc(names.B)}</div></div>
    <p class="typew" style="margin:0;font-size:17px;line-height:34px">${f(sc.pitch)}</p>
    <div class="marker" style="font-size:20px;color:#D7262E;transform:rotate(-2deg)">→ Apprenez l'alibi par cœur et inventez ensemble TOUT le reste.</div>
  </div>
  <div class="dropIn" style="--r:-5deg;position:absolute;left:250px;top:478px;width:200px;background:#FFF;border:4px solid ${INK};padding:8px 8px 6px;box-shadow:5px 6px 0 rgba(21,19,31,.35)">
    <div style="height:86px;background:#2A2048;border:3px solid ${INK};overflow:hidden"><svg aria-hidden="true" width="178" height="80" viewBox="0 0 204 92"><defs><radialGradient id="spot" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#FF7BD5" stop-opacity=".7"/><stop offset="1" stop-color="#FF7BD5" stop-opacity="0"/></radialGradient></defs><rect width="204" height="92" fill="url(#spot)"/><rect y="70" width="204" height="22" fill="#3B2A5E"/><rect x="76" y="16" width="52" height="52" rx="8" fill="none" stroke="#FFF8EA" stroke-width="4" stroke-dasharray="8 6"/><text x="102" y="54" text-anchor="middle" font-family="Lilita One" font-size="28" fill="#FFC23D">?</text></svg></div>
    <div class="marker" style="font-size:14px;text-align:center">${esc(sc.photo)}</div>
  </div>
  <div class="fadeIn" style="position:absolute;left:668px;top:120px;width:364px;transform:rotate(1.2deg);display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div class="lil" style="font-size:24px;color:#16213A">L'ALIBI OFFICIEL</div><div class="typew" style="font-size:12px;color:#6B6355">À NE PAS OUBLIER</div></div>
    ${facts}
  </div>
  <div style="position:absolute;left:860px;top:590px">${SC.stopwatch()}</div>
  <div style="position:absolute;left:980px;top:604px;display:flex;flex-direction:column">
    <div style="font-weight:900;font-size:14px;letter-spacing:2px;color:#FFE7A8">PRÉPARATION</div>
    <div class="lil tick" data-timer style="font-size:56px;line-height:1;color:#FFF8EA;text-shadow:0 5px 0 ${INK},0 0 24px rgba(255,90,95,.6)">--</div>
  </div>
  <div style="position:absolute;left:236px;top:640px;display:flex;align-items:center;gap:12px;background:#16213A;color:#FFF8EA;border:4px solid ${INK};border-radius:99px;padding:8px 22px 8px 12px;box-shadow:0 6px 0 ${INK}">
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 34 34"><rect x="11" y="3" width="12" height="18" rx="6" fill="#6FD6B8" stroke="#FFF8EA" stroke-width="2.5"/><path d="M6 16 Q6 27 17 27 Q28 27 28 16" fill="none" stroke="#FFF8EA" stroke-width="2.5" stroke-linecap="round"/><line x1="17" y1="27" x2="17" y2="32" stroke="#FFF8EA" stroke-width="2.5"/></svg>
    <div style="font-weight:900;font-size:17px">${playing ? "Filez en vocal privé avec " + esc(partner ? partner.name : "ton binôme") : "Le Duo " + duo + " répète en privé. Vous passez juste après !"}</div>
  </div>
  <div style="position:absolute;right:24px;top:22px;display:flex;flex-direction:column;align-items:flex-end;gap:10px">
    ${playing ? `<button class="btn ${ready?"green":"red"}" data-act="ready" style="font-size:24px">${ready?"✓ PRÊT !":"ON EST PRÊTS"}</button>`
              : `<div class="lil" style="font-size:18px;background:#FFC23D;border:4px solid ${INK};border-radius:14px;padding:6px 14px;box-shadow:0 5px 0 ${INK}">TU OBSERVES</div>`}
    <div style="display:flex;gap:6px;background:rgba(21,19,31,.55);padding:6px;border-radius:99px">${readyDots}</div>
    ${isHost() ? `<button class="btn small cream" data-act="next" style="font-size:13px">Lancer l'interrogatoire</button>` : ""}
  </div>`;
}

/* Interrogatoire */
function chipsHtml(){
  const ps = L.members(S, S.turn);
  const chip = p => `<div class="chip" data-chip="${esc(p.id)}"><div class="dot">${A.portrait(p.av, S.signed[p.id]?"smirk":"neutral", 30, 30)}</div>${esc(p.name)}<div class="tag" style="background:${S.signed[p.id]?"#6FD6B8":"#FFC23D"}">${S.signed[p.id]?"SIGNÉ":"TAPE…"}</div></div>`;
  const watchers = L.members(S, S.turn==="A"?"B":"A").map(p=>esc(p.name)).join(" & ");
  return `<div id="chipsL" style="position:absolute;left:24px;bottom:18px;display:flex;flex-direction:column;gap:8px">
      <div class="lil" style="font-size:14px;color:#FFC23D;text-shadow:0 2px 0 ${INK}">EN INTERROGATOIRE · DUO ${S.turn}</div>${ps.map(chip).join("")}</div>
    <div class="marker" style="position:absolute;right:64px;bottom:22px;background:#FFF8EA;border:3px solid ${INK};border-radius:10px;padding:4px 12px;font-size:15px;transform:rotate(-2deg)">Derrière le miroir : ${watchers}</div>`;
}
function renderInterro(){
  const duo = S.turn, qt = questionText(S.round, S.q, duo), signed = !!S.signed[myId];
  const playing = me() && me().duo === duo;
  const dots = Array.from({length:10},(_,i)=> i===S.q
      ? `<div class="lil" style="width:30px;height:30px;border-radius:50%;background:#FFC23D;border:4px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:16px">${i+1}</div>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:${i<S.q?"#6FD6B8":"#2E4650"};border:3px solid ${INK}"></div>`).join("");
  const nm = L.duoNames(S,duo), rx = x => x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const highlight = esc(qt).replace(new RegExp("("+rx(esc(nm.A))+"|"+rx(esc(nm.B))+")","g"), `<span style="color:#FF5A5F">$1</span>`);
  const mirror = playing ? "LE DUO " + (duo==="A"?"B":"A") + " OBSERVE" : "TOI, TU OBSERVES";
  return SC.room(mirror) + `
  <div style="position:absolute;left:30px;top:22px"><div class="lil" style="font-size:20px;background:#FFC23D;border:4px solid ${INK};border-radius:12px;padding:2px 14px;box-shadow:0 4px 0 ${INK}">MANCHE ${S.round+1} · DUO ${duo}</div></div>
  <div style="position:absolute;left:270px;top:26px;display:flex;gap:7px;align-items:center">${dots}</div>
  <div class="popIn" style="position:absolute;left:380px;top:96px;width:460px">
    <div style="position:relative;background:#FFF8EA;border:6px solid ${INK};border-radius:34px;padding:22px 30px 26px;box-shadow:0 8px 0 ${INK}">
      <div style="display:flex;align-items:center;gap:10px"><div class="marker" style="font-size:18px;color:#2F5DA8">Inspecteur Moustache</div><div style="height:3px;flex:1;background:#E9DFCB"></div>
        <button type="button" data-act="repeat" aria-label="Répéter la question" style="border:3px solid ${INK};border-radius:50%;width:34px;height:34px;background:#FFC23D;font-weight:900">🔊</button></div>
      <div class="lil" style="font-size:${qt.length>70?30:36}px;line-height:1.12;color:#16213A">${highlight}</div>
    </div>
    <svg aria-hidden="true" width="80" height="60" viewBox="0 0 80 60" style="position:absolute;left:-46px;top:120px"><path d="M76 6 L6 50 L70 34" fill="#FFF8EA" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="62" y="8" width="18" height="24" fill="#FFF8EA"/></svg>
    <svg aria-hidden="true" width="70" height="70" viewBox="0 0 70 70" style="position:absolute;right:-36px;top:-30px"><path d="M35 4 L42 24 L62 18 L50 34 L66 46 L44 46 L42 66 L32 50 L16 62 L22 42 L4 34 L24 28 Z" fill="#FFC23D" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><text x="35" y="44" text-anchor="middle" font-family="Lilita One" font-size="22" fill="${INK}">?!</text></svg>
  </div>
  <div style="position:absolute;right:26px;top:16px;display:flex;align-items:center;gap:4px;background:#16213A;border:4px solid ${INK};border-radius:20px;padding:6px 18px 6px 8px;box-shadow:0 5px 0 #05080F">
    ${SC.stopwatch().replace('width="110" height="122"','width="58" height="64"')}
    <div class="lil" id="tnum" data-timer style="font-size:46px;color:#FF5A5F;line-height:1;text-shadow:0 0 18px rgba(255,90,95,.7);min-width:56px;text-align:center">--</div>
    <div style="font-weight:900;font-size:13px;color:#C9D2E3;margin-left:4px">SEC</div>
  </div>
  ${playing ? `
  <form id="ansForm" style="position:absolute;left:486px;top:478px;width:330px;display:flex;flex-direction:column;gap:4px">
    <label for="answer" style="font-weight:900;font-size:12px;letter-spacing:2px;color:#8A8172">TA DÉPOSITION · SECRÈTE</label>
    <input id="answer" type="text" maxlength="80" autocomplete="off" ${signed?"disabled":""} placeholder="${signed?"":"Tape ta réponse…"}" value="${signed?esc(myAnswers[S.round+"-"+S.q]||"Déposition signée"):""}" style="font-family:'Special Elite',monospace;font-size:20px;background:transparent;border:none;border-bottom:3px solid ${INK};padding:2px 0;color:${INK};outline:none">
  </form>
  <button type="button" data-act="sign" id="signBtn" ${signed?"disabled":""} style="position:absolute;left:880px;top:470px;width:130px;height:130px;border-radius:50%;font-family:'Lilita One';font-size:26px;letter-spacing:1px;background:${signed?"#6B6355":"#2EA35A"};color:#FFF8EA;border:6px solid ${INK};box-shadow:0 8px 0 ${INK},inset 0 -8px 0 rgba(0,0,0,.18);transform:rotate(-8deg)">${signed?"SIGNÉ ✓":"SIGNER"}</button>
  ${signed ? `<div class="lil stampIn" style="--r:-12deg;position:absolute;left:560px;top:500px;font-size:40px;color:#2EA35A;border:6px solid #2EA35A;border-radius:12px;padding:0 14px;background:rgba(255,255,255,.6);animation-delay:0s">SIGNÉ</div>` : ""}`
  : `<div style="position:absolute;left:486px;top:480px;width:330px;display:flex;flex-direction:column;gap:6px">
    <div style="font-weight:900;font-size:12px;letter-spacing:2px;color:#8A8172">PROCÈS-VERBAL EN COURS</div>
    <div class="typew" style="font-size:17px;line-height:1.35">Le Duo ${duo} est sur le grill. Toi, tu observes derrière le miroir… et tu notes leurs hésitations.</div></div>`}
  <div id="chips">${chipsHtml()}</div>`;
}
function patchInterro(){
  const c = $("#chips"); if(c) c.innerHTML = chipsHtml();
  if(S.signed[myId]){ const inp = $("#answer"); if(inp && !inp.disabled){ render(lastKey = ""); } }
  tickTimers(true);
}

/* Révélation */
const LINES_OK = ["Hmm… ça colle. Pour l'instant.","Bien répété, les loulous.","Mêmes versions. Suspect.","Je note. Concordant."];
const LINES_KO = ["Tiens tiens… intéressant.","Quelqu'un ment dans cette pièce.","Ah. Ça ne colle pas du tout.","Je le savais !"];
function renderReveal(){
  const {q, duo} = L.stepInfo(S.ridx, S), m = L.members(S, duo), ans = S.answers[S.round+"-"+q] || {};
  const ok = L.matchOf(S, S.round, q, duo), sc = L.scores(S).total;
  const k = S.round+"-"+q+"-"+duo, over = k in S.overrides;
  const canOverride = isHost() || (me() && me().duo && me().duo !== duo);
  const line = (ok?LINES_OK:LINES_KO)[(S.ridx+S.round)%4];
  const card = (p, i) => {
    const expr = ok ? "happy" : (i===0 ? "smirk" : "confused"), a = p ? ans[p.id] : "";
    return `<div class="dropIn" style="--r:${i?3:-4}deg;position:absolute;left:${i?744:184}px;top:176px;width:352px;height:380px;background:#FFF8EA;border:5px solid ${INK};box-shadow:0 10px 0 rgba(21,19,31,.35);padding:20px 24px;display:flex;flex-direction:column;gap:12px;animation-delay:${i*.15}s">
      <div style="position:absolute;left:116px;top:-30px;width:110px;height:46px;background:#C9D2E3;border:5px solid ${INK};border-radius:10px 10px 4px 4px"></div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:132px;height:150px;background:#FFF;border:4px solid ${INK};padding:6px 6px 18px;transform:rotate(${i?3:-3}deg);box-shadow:3px 5px 0 rgba(21,19,31,.3)"><div class="ph ${duo}" style="width:100%;height:100%;border:2px solid ${INK};overflow:hidden;display:flex;align-items:flex-end;justify-content:center">${portrait(p, expr, 112, 116)}</div></div>
        <div style="display:flex;flex-direction:column;min-width:0"><div class="typew" style="font-size:14px;color:#6B6355">DÉPOSITION DE</div><div class="lil" style="font-size:30px;line-height:1;word-break:break-word">${esc(p?p.name:"?")}</div><div class="marker" style="font-size:15px;color:#2F5DA8">Duo ${duo}</div></div>
      </div>
      <div style="height:0;border-top:3px dashed #B9A88A"></div>
      <div class="typew" style="font-size:${(a||"").length>40?24:30}px;line-height:1.25;word-break:break-word">${a ? "« "+esc(a)+" »" : `<span style="color:#9B9384">(silence total…)</span>`}</div>
      <div class="marker" style="margin-top:auto;font-size:17px;color:#6B6355">Signé : ${esc(p?p.name:"?")}</div>
    </div>`;
  };
  return SC.burst() + `
  <div style="position:absolute;left:0;right:0;top:0;height:104px;background:#16213A;border-bottom:6px solid ${INK};display:flex;align-items:center;justify-content:space-between;padding:0 40px">
    <div style="display:flex;align-items:center;gap:18px;min-width:0">
      <div class="lil" style="font-size:22px;background:#FF5A5F;color:#FFF8EA;border:4px solid ${INK};border-radius:12px;padding:4px 14px;transform:rotate(-3deg)">CONFRONTATION</div>
      <div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:900;font-size:14px;letter-spacing:2px;color:#9FD3FF">DUO ${duo} · MANCHE ${S.round+1} · QUESTION ${q+1} / 10</div>
      <div class="lil" style="font-size:${questionText(S.round,q,duo).length>60?20:26}px;color:#FFF8EA;line-height:1.1;max-width:760px">${esc(questionText(S.round,q,duo))}</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;background:#05080F;border:4px solid ${INK};border-radius:16px;padding:6px 12px">
      <div style="display:flex;flex-direction:column;align-items:center;padding:0 10px"><div style="font-weight:900;font-size:12px;letter-spacing:2px;color:#9FD3FF">DUO A</div><div class="lil" style="font-size:40px;color:#3D8BFF;line-height:1;text-shadow:0 0 14px rgba(61,139,255,.8)">${String(sc.A).padStart(2,"0")}</div></div>
      <div style="width:4px;height:46px;background:#2A3550;border-radius:2px"></div>
      <div style="display:flex;flex-direction:column;align-items:center;padding:0 10px"><div style="font-weight:900;font-size:12px;letter-spacing:2px;color:#FFB3AE">DUO B</div><div class="lil" style="font-size:40px;color:#FF5A5F;line-height:1;text-shadow:0 0 14px rgba(255,90,95,.8)">${String(sc.B).padStart(2,"0")}</div></div>
    </div>
  </div>
  ${card(m[0],0)}${card(m[1],1)}
  <svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true">
    <g class="wob"><g transform="translate(640 372)"><circle r="52" fill="${ok?"#2EA35A":"#FF5A5F"}" stroke="${INK}" stroke-width="7"/><path d="M-30 -36 A46 46 0 0 1 30 -36" stroke="#FFF" stroke-opacity=".4" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-24 -12 H24 M-24 12 H24" stroke="#FFF8EA" stroke-width="9" stroke-linecap="round"/>${ok?"":`<path d="M14 -30 L-14 30" stroke="#FFF8EA" stroke-width="9" stroke-linecap="round"/>`}</g></g>
  </svg>
  <div class="stampIn" style="--r:-8deg;position:absolute;left:390px;top:506px;width:500px;height:96px;border:9px solid ${ok?"#1E7A41":"#D7262E"};border-radius:16px;background:rgba(255,248,234,.35);mix-blend-mode:multiply;display:flex;align-items:center;justify-content:center;pointer-events:none">
    <div class="lil" style="font-size:${ok?58:60}px;color:${ok?"#1E7A41":"#D7262E"};letter-spacing:3px">${ok?"CONCORDANT":"CONTRADICTION"}</div></div>
  ${over ? `<div class="marker" style="position:absolute;left:560px;top:612px;background:#FFF8EA;border:3px solid ${INK};padding:2px 10px;transform:rotate(-4deg);font-size:15px">Décision contestée !</div>` : ""}
  <div style="position:absolute;left:24px;bottom:16px;display:flex;align-items:flex-end;gap:10px">${A.inspectorHead(112,116)}<div class="bob marker" style="margin-bottom:30px;background:#FFF8EA;border:4px solid ${INK};border-radius:18px 18px 18px 4px;padding:8px 16px;font-size:19px;box-shadow:0 5px 0 ${INK}">${line}</div></div>
  <div style="position:absolute;right:70px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:10px">
    ${canOverride ? `<button class="btn small ${ok?"cream":"yellow"}" data-act="override" style="font-size:15px">${ok?"✋ ÇA COMPTE PAS !":"✋ ÇA COMPTE QUAND MÊME"}</button>` : ""}
    ${isHost() ? `<button class="btn" data-act="next" style="font-size:24px">SUIVANT → <span data-timer style="font-size:16px;opacity:.7"></span></button>` : `<div class="lil" style="background:rgba(21,19,31,.75);color:#FFF8EA;border-radius:12px;padding:6px 14px;font-size:16px">Suite dans <span data-timer></span> s</div>`}
  </div>`;
}

/* Fin de manche */
function renderRoundEnd(){
  const {total, per} = L.scores(S), r = per[S.round] || {A:0,B:0};
  const nm = d => L.members(S,d).map(p=>esc(p.name)).join(" & ");
  const lead = total.A===total.B ? "Égalité parfaite. L'inspecteur transpire." : `Le Duo ${total.A<total.B?"A":"B"} sent déjà la cellule…`;
  return SC.burst() + `
  <div class="popIn" style="position:absolute;left:250px;top:110px;width:780px;background:#FFF8EA;border:6px solid ${INK};border-radius:24px;box-shadow:0 12px 0 ${INK};padding:28px 36px;display:flex;flex-direction:column;gap:18px;align-items:center">
    <div class="typew" style="font-size:16px;color:#6B6355">RAPPORT INTERMÉDIAIRE</div>
    <h1 class="lil" style="margin:0;font-size:56px;color:#16213A">FIN DE LA MANCHE ${S.round+1} / 3</h1>
    <div style="display:flex;gap:30px;width:100%">
      ${["A","B"].map(d=>`<div style="flex:1;border:5px solid ${INK};border-radius:18px;background:${d==="A"?"#BFD4F2":"#F7C6C0"};padding:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="display:flex;gap:4px">${L.members(S,d).map(p=>`<div style="width:70px;height:70px;border-radius:50%;border:4px solid ${INK};overflow:hidden;background:#FFF8EA">${A.portrait(p.av, (d==="A"?total.A>=total.B:total.B>=total.A)?"happy":"sad", 70, 70)}</div>`).join("")}</div>
        <div class="marker" style="font-size:18px">${nm(d)}</div>
        <div class="lil" style="font-size:64px;line-height:1;color:${d==="A"?"#2F5DA8":"#C4232D"}">${total[d]}</div>
        <div style="font-weight:900;font-size:14px;color:#6B6355">+${r[d]} cette manche</div></div>`).join("")}
    </div>
    <div class="marker" style="font-size:22px;color:#D7262E">${lead}</div>
    ${isHost() ? `<button class="btn red" data-act="next" style="font-size:26px"><span class="shine"></span><span class="t">MANCHE SUIVANTE (<span data-timer></span>)</span></button>` : `<div class="lil" style="font-size:20px">Manche suivante dans <span data-timer></span> s</div>`}
  </div>`;
}

/* Verdict */
function renderVerdict(){
  const {total} = L.scores(S), both = S.loser === "both";
  const losers = both ? L.seated(S) : L.members(S, S.loser);
  const winners = both ? [] : L.members(S, S.loser==="A"?"B":"A");
  let figs = "";
  if(!both){
    const pos = [[262,304],[564,308]];
    losers.forEach((p,i)=> figs += `<g class="sway" style="animation-delay:${-i*1.8}s"><g transform="translate(${pos[i][0]} ${pos[i][1]}) scale(1.12)">${A.detainee(p.av, i===0?"sad":"shocked", "047-"+S.loser+(i+1))}</g></g>`);
  } else {
    const pos = [[118,360],[300,370],[512,364],[694,370]];
    losers.forEach((p,i)=> figs += `<g class="sway" style="animation-delay:${-i*.9}s"><g transform="translate(${pos[i][0]} ${pos[i][1]}) scale(.82)">${A.detainee(p.av, i%2?"shocked":"sad", "047-"+(i+1))}</g></g>`);
  }
  const bar = (d, v) => `<div style="display:flex;align-items:center;gap:12px"><div style="width:70px;font-weight:900;font-size:18px">Duo ${d}</div><div style="flex:1;height:22px;background:#E9DFCB;border:3px solid ${INK};border-radius:99px;overflow:hidden"><div style="width:${Math.round(v/30*100)}%;height:100%;background:${(S.loser===d||both)?"#FF5A5F":"#2EA35A"}"></div></div><div class="lil" style="width:40px;text-align:right;font-size:28px;color:${(S.loser===d||both)?"#C4232D":"#1E7A41"}">${v}</div></div>`;
  const ln = losers.map(p=>esc(p.name)).join(" & ");
  return SC.cellBack() + `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true">${figs}</svg>` + SC.cellFront() + `
  <div style="position:absolute;left:864px;right:36px;top:36px;bottom:62px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;gap:10px"><div class="pulse" style="width:12px;height:12px;border-radius:50%;background:#FF5A5F;box-shadow:0 0 12px #FF5A5F"></div><div style="font-weight:900;font-size:14px;color:#FFB3AE;letter-spacing:3px">VERDICT FINAL</div></div>
    <h1 class="neon" style="margin:0;font-family:'Stardos Stencil','Lilita One';font-weight:700;font-size:${both?50:60}px;line-height:.95;color:#FF5A5F;text-shadow:0 6px 0 #05080F,0 0 40px rgba(255,90,95,.45);transform:rotate(-3deg)">${both?"TOUS COUPABLES":"COUPABLES"}</h1>
    <div style="font-weight:800;font-size:18px;color:#E9DFCB;line-height:1.4">${both ? "Égalité parfaite : l'inspecteur embarque tout le monde." : `<span class="marker" style="color:#FFC23D">${ln}</span> partent en cellule.${winners.length?` ${winners.map(p=>esc(p.name)).join(" & ")} sont libres.`:""}`}</div>
    <div style="background:#FFF8EA;border:5px solid ${INK};border-radius:16px;box-shadow:0 7px 0 #05080F;padding:12px 18px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;font-weight:900;font-size:13px;letter-spacing:1px;color:#6B6355"><div>RÉPONSES IDENTIQUES</div><div>SUR 30</div></div>
      ${bar("A", total.A)}${bar("B", total.B)}
    </div>
    <div style="display:flex;align-items:center;gap:12px;background:#FFC23D;border:4px solid ${INK};border-radius:14px;padding:10px 14px;transform:rotate(1.5deg);box-shadow:0 6px 0 #05080F">
      <div class="lil" style="font-size:18px;background:${INK};color:#FFC23D;border-radius:8px;padding:2px 10px">PEINE</div>
      <div class="marker" style="font-size:17px;line-height:1.2">${esc(S.gage)}</div>
    </div>
    <div style="margin-top:auto;display:flex;gap:12px">
      <button class="btn cream" data-act="worst" style="flex:1;font-size:20px;padding:12px 6px">PIRES RÉPONSES</button>
      ${isHost() ? `<button class="btn green" data-act="rematch" style="flex:1;font-size:20px;padding:12px 6px">REVANCHE</button>` : `<div class="lil" style="flex:1;color:#FFF8EA;font-size:15px;text-align:center;align-self:center">L'hôte peut lancer la revanche</div>`}
    </div>
  </div>`;
}

/* Modales */
function showModal(m){ modal = m; if(S) { const old = $(".modal"); if(old) old.remove(); stage.insertAdjacentHTML("beforeend", modalHtml()); } else render(); }
function modalHtml(){
  if(!modal) return "";
  if(modal === "hostgone") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:40px">L'hôte a quitté le commissariat</h2>
    <p style="margin:0;font-weight:800">La salle est fermée. Recréez-en une pour rejouer.</p>
    <button class="btn red" data-act="home">RETOUR À L'ACCUEIL</button></div></div>`;
  if(modal === "worst"){
    const rows = [];
    for(let r=0;r<3;r++) for(let q=0;q<10;q++) for(const duo of ["A","B"]){
      if(!L.scenOf(S,r,duo)) continue;
      const m = L.members(S,duo), a = S.answers[r+"-"+q]||{};
      if(m.length<2 || L.matchOf(S,r,q,duo)) continue;
      rows.push(`<div style="border-bottom:2px dashed #B9A88A;padding:10px 0"><div style="font-weight:900;font-size:14px;color:#6B6355">DUO ${duo} · ${esc(L.scenOf(S,r,duo).titre)} · ${esc(questionText(r,q,duo))}</div>
        <div style="display:flex;gap:20px;margin-top:4px"><div class="typew" style="flex:1;font-size:18px"><b>${esc(m[0].name)}</b> : « ${esc(a[m[0].id]||"…")} »</div><div class="typew" style="flex:1;font-size:18px"><b>${esc(m[1].name)}</b> : « ${esc(a[m[1].id]||"…")} »</div></div></div>`);
    }
    return `<div class="modal"><div class="sheet popIn" style="width:900px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2 class="lil" style="margin:0;font-size:36px">LE BÊTISIER DES DÉPOSITIONS</h2><button class="btn small" data-act="close">FERMER</button></div>
      ${rows.length ? rows.join("") : `<p class="marker" style="font-size:20px">Aucune contradiction… louche.</p>`}</div></div>`;
  }
  return "";
}

/* ---------- Minuteurs ---------- */
let lastSec = -1;
function tickTimers(force){
  if(!S) return;
  const ms = remaining(), s = Math.ceil(ms/1000);
  document.querySelectorAll("[data-timer]").forEach(el => { el.textContent = localDeadline ? fmtTime(ms) : ""; });
  const t = $("#tnum");
  if(t){ t.classList.toggle("urgent", s <= 5 && s > 0); if(s !== lastSec && s <= 5 && s > 0 && !S.signed[myId]) AU.sfx("urgent"); }
  lastSec = s;
}
setInterval(tickTimers, 200);

/* ---------- Événements ---------- */
function readName(){ const n = $("#nm"); if(n){ myName = n.value.trim().slice(0,16); store.set("pd_name", myName); } return myName; }
stage.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if(!b || b.disabled) return;
  AU.unlock(); AU.sfx("click");
  const d = b.dataset;
  switch(d.act){
    case "av": readName(); myAv = +d.v; store.set("pd_av", myAv); renderHome(); break;
    case "create": if(!readName()){ toast("Choisis d'abord un nom de code !"); $("#nm").focus(); return; } createRoom(); break;
    case "join": {
      if(!readName()){ toast("Choisis d'abord un nom de code !"); $("#nm").focus(); return; }
      const c = urlCode || ($("#code") ? $("#code").value.toUpperCase().replace(/[^A-Z]/g,"") : "");
      if(c.length !== 4){ toast("Le code fait 4 lettres."); return; }
      joinRoom(c); break;
    }
    case "forget": urlCode = ""; history.replaceState(null,"",location.pathname); renderHome(); break;
    case "slot": act({type:"slot", duo:d.duo, slot:+d.slot}); break;
    case "bot": act({type:"addBot", duo:d.duo, slot:+d.slot}); break;
    case "kick": act({type:"kick", id:d.id}); break;
    case "stand": act({type:"leaveSeat"}); break;
    case "start": act({type:"start"}); break;
    case "copy": navigator.clipboard && navigator.clipboard.writeText(link()).then(()=>toast("Lien copié ! Colle-le sur Discord."), ()=>toast(link())); break;
    case "ready": act({type:"ready"}); break;
    case "next": act({type:"next"}); break;
    case "sign": submit(); break;
    case "repeat": AU.speak(questionText(S.round, S.q, S.turn)); break;
    case "override": act({type:"override", idx:S.ridx}); break;
    case "rematch": act({type:"rematch"}); break;
    case "worst": modal = "worst"; render(); break;
    case "close": modal = null; render(); break;
    case "home": location.href = location.pathname; break;
  }
});
stage.addEventListener("submit", e => { e.preventDefault(); submit(); });
stage.addEventListener("keydown", e => {
  if(e.key === "Enter" && e.target.id === "nm"){ e.preventDefault(); const b = document.querySelector('[data-act="join"],[data-act="create"]'); if(b) b.click(); }
  if(e.key === "Enter" && e.target.id === "code"){ e.preventDefault(); const b = document.querySelector('[data-act="join"]'); if(b) b.click(); }
  if(e.target.id === "answer" && e.key.length === 1) AU.sfx("type");
});
function submit(){
  const inp = $("#answer"); if(!inp || inp.disabled) return;
  const v = inp.value.trim();
  if(!v){ toast("Écris quelque chose (même n'importe quoi) !"); inp.focus(); return; }
  myAnswers[S.round+"-"+S.q] = v; AU.sfx("stamp"); act({type:"answer", text:v});
}

$("#mute").addEventListener("click", () => { const m = AU.toggle(); $("#mute").textContent = m ? "🔇" : "🔊"; $("#mute").setAttribute("aria-label", m ? "Activer le son" : "Couper le son"); });
$("#mute").textContent = AU.isMuted() ? "🔇" : "🔊";

addEventListener("beforeunload", e => { if(role === "host" && S && S.phase !== "lobby"){ e.preventDefault(); e.returnValue = ""; } });

renderHome();
window.__pd = { get S(){ return S; }, act, myId };
})();
