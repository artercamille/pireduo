(function(){
const L = window.LOGIC, A = window.ART, SC = window.SCENES, AU = window.AUDIO, INK = "#15131F";
const $ = s => document.querySelector(s);
const stage = $("#stage"), screen = $("#screen"), fxLayer = $("#fx");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mkStore = area => ({
  get(k,d){ try{ const v = window[area].getItem(k); return v===null ? d : v; }catch(e){ return d; } },
  set(k,v){ try{ window[area].setItem(k,v); }catch(e){} },
  del(k){ try{ window[area].removeItem(k); }catch(e){} }
});
const store = mkStore("localStorage"), tab = mkStore("sessionStorage");

// Un identifiant par onglet : deux onglets du même navigateur = deux joueurs distincts,
// et un refresh garde le même joueur.
let myId = tab.get("pd_tab_id", null);
if(!myId){ myId = "p-" + Math.random().toString(36).slice(2,10); tab.set("pd_tab_id", myId); }
let myName = store.get("pd_name", ""), myAv = parseInt(store.get("pd_av", ""));
if(!L.AVATAR_IDS.includes(myAv)) myAv = L.AVATAR_IDS[0];
const params = new URLSearchParams(location.search);
let urlCode = (params.get("salle") || "").toUpperCase().replace(/[^A-Z]/g,"").slice(0,4);

let S = null, role = null, peer = null, conns = {}, hostConn = null, localDeadline = null, hostLoop = null;
let lastSig = null, lastKey = "", lastScreenKey = "", modal = null, connecting = false, connectMsg = "";
let roomCode = "", kicked = false, reconnectUntil = 0, retryT = null, lastOv = "";
const myAnswers = {};
let trapDraft = "";
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

// Horloge de l'hôte dans un Worker : les onglets en arrière-plan (Discord par-dessus)
// ne sont plus ralentis par le navigateur.
function startTicker(fn){
  if(hostLoop) return;
  try{
    const w = new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),250)"], {type:"text/javascript"})));
    w.onmessage = fn; hostLoop = w; return;
  }catch(e){}
  hostLoop = setInterval(fn, 250);
}
function createRoom(){ openHost(genCode(), null, 0); }
function openHost(code, saved, attempt){
  if(connecting && !attempt) return;
  connecting = true; connectMsg = saved ? "RÉOUVERTURE DE LA SALLE…" : "OUVERTURE…"; if(!S) renderHome();
  try{ if(peer) peer.destroy(); }catch(e){}
  peer = new Peer(PREFIX + code, PEER_OPTS);
  peer.on("open", () => {
    connecting = false; role = "host"; roomCode = code;
    if(saved){
      S = saved;
      for(const id in S.players){ const p = S.players[id]; if(!p.bot && id !== myId) p.online = false; }
      S.players[myId] && (S.players[myId].online = true);
    } else {
      S = L.createState(code, myId);
      L.addPlayer(S, myId, myName, myAv);
    }
    history.replaceState(null, "", roomQuery(code));
    startTicker(() => { if(L.tick(S, Date.now())) changed(); });
    changed();
    if(saved) toast("Salle rouverte : les joueurs reviennent automatiquement.");
  });
  peer.on("connection", c => {
    c.on("data", d => onHostData(c, d));
    c.on("close", () => {
      const id = c._pid; if(!id || conns[id] !== c) return;
      delete conns[id];
      if(S.players[id]){ if(S.phase==="lobby" && !S.players[id].seatKeep) L.removePlayer(S, id); else S.players[id].online = false; }
      changed();
    });
  });
  peer.on("error", e => {
    if(e.type === "unavailable-id"){
      try{ peer.destroy(); }catch(_){}
      if(saved){ if(attempt < 40) return setTimeout(() => openHost(code, saved, attempt+1), 1500); }
      else { connecting = false; return openHost(genCode(), null, 0); }
    }
    if(role !== "host"){ connecting = false; toast("Impossible d'ouvrir la salle (" + e.type + ")"); tab.del("pd_host"); renderHome(); }
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
    if(S.phase === "lobby") S.players[id].seatKeep = false;
    changed();
  } else if(d.t === "act" && c._pid && d.a && typeof d.a === "object"){
    if(d.a.type === "react") return fxBroadcast(String(d.a.kind), c._pid);
    if(L.reduce(S, d.a, c._pid, Date.now())) changed();
  }
}

function broadcast(){
  const sent = Date.now(), pub = Object.assign({}, S, {drafts:{}}), full = {t:"state", s:pub, sent};
  let masked = full;
  if(S.phase === "interro" || S.phase === "dossier"){
    const hideIds = new Set(L.members(S, S.turn).map(p=>p.id)), answers = {};
    for(const k in S.answers){
      if(k.split("-")[0] !== String(S.round)){ answers[k] = S.answers[k]; continue; }
      answers[k] = {}; for(const id in S.answers[k]) if(!hideIds.has(id)) answers[k][id] = S.answers[k][id];
    }
    const extra = Object.assign({}, S.extra), ek = S.round+"-"+S.turn;
    if(extra[ek] && !(S.phase === "interro" && S.q >= 10)) extra[ek] = Object.assign({}, extra[ek], {text:""});
    masked = {t:"state", s:Object.assign({}, pub, {answers, extra}), sent};
  }
  for(const id in conns){
    const c = conns[id]; if(!c.open) continue;
    const p = S.players[id], msg = (p && p.duo === S.turn) ? masked : full;
    try{ c.send(msg); }catch(e){}
  }
}
/* Réactions (effets éphémères, hors état) */
const REACTS = {menteur:"MENTEUR !", mdr:"MDR", aie:"AÏE AÏE AÏE", fort:"TROP FORT", louche:"LOUCHE…"};
const lastReact = {};
function fxBroadcast(kind, pid){
  const now = Date.now(); if(lastReact[pid] && now - lastReact[pid] < 900) return; lastReact[pid] = now;
  const p = S.players[pid]; if(!p || !REACTS[kind]) return;
  const msg = {t:"fx", kind, name:p.name, av:p.av};
  for(const id in conns){ const c = conns[id]; if(c.open){ try{ c.send(msg); }catch(e){} } }
  showFx(msg);
}
function showFx(m){
  if(!REACTS[m.kind]) return;
  const el = document.createElement("div");
  const x = 120 + Math.random()*1000, rot = (Math.random()*16-8).toFixed(1);
  const col = {menteur:"#FF5A5F", mdr:"#FFC23D", aie:"#B48CF2", fort:"#6FD6B8", louche:"#9FD3FF"}[m.kind];
  el.className = "fxPop";
  el.style.cssText = `left:${x}px;--r:${rot}deg`;
  el.innerHTML = `<div class="fxIn" style="background:${col}"><div class="fxAv">${A.portrait(m.av, m.kind==="mdr"||m.kind==="fort"?"happy":(m.kind==="menteur"?"smirk":"shocked"), 40, 40)}</div><div><div class="lil" style="font-size:24px;line-height:1">${REACTS[m.kind]}</div><div style="font-weight:900;font-size:12px">${esc(m.name)}</div></div></div>`;
  fxLayer.appendChild(el); AU.sfx("pop");
  setTimeout(()=>el.remove(), 2600);
}
function changed(){
  broadcast();
  try{ tab.set("pd_host", JSON.stringify(S)); }catch(e){}
  applyState(S, S.deadline ? S.deadline - Date.now() : null);
}

function joinRoom(code, isRetry){
  if(connecting && !isRetry) return;
  connecting = true; connectMsg = "CONNEXION…"; roomCode = code;
  if(!S) renderHome();
  try{ if(peer) peer.destroy(); }catch(e){}
  peer = new Peer(undefined, PEER_OPTS);
  let got = false;
  const fail = (msg) => { connecting = false; toast(msg); try{ peer.destroy(); }catch(e){} peer = null; tab.del("pd_room"); renderHome(); };
  const timeout = setTimeout(() => { if(got) return; if(!S) fail("Salle introuvable. Vérifie le code."); else onLost(); }, 12000);
  peer.on("open", () => {
    const c = peer.connect(PREFIX + code, {reliable:true}); hostConn = c;
    c.on("open", () => { role = "client"; c.send({t:"join", id:myId, name:myName, av:myAv}); });
    c.on("data", d => {
      if(c !== hostConn) return;
      if(d.t === "state"){
        got = true; clearTimeout(timeout); connecting = false; reconnectUntil = 0;
        if(modal === "reconnect"){ modal = null; const m = $(".modal"); if(m) m.remove(); }
        tab.set("pd_room", code);
        if(!S) history.replaceState(null,"",roomQuery(code));
        applyState(d.s, d.s.deadline ? d.s.deadline - d.sent : null);
      }
      else if(d.t === "fx") showFx(d);
      else if(d.t === "full"){ clearTimeout(timeout); got = true; if(S){ modal = null; showModal("hostgone"); } else fail("La partie a déjà commencé dans cette salle."); }
      else if(d.t === "kicked"){ kicked = true; tab.del("pd_room"); showModal("kicked"); }
    });
    c.on("close", () => { if(c !== hostConn || kicked) return; onLost(); });
  });
  peer.on("error", e => {
    clearTimeout(timeout);
    if(!S){ if(e.type === "peer-unavailable") fail("Aucune salle avec le code " + code + "."); else fail("Connexion impossible (" + e.type + ")."); }
    else onLost();
  });
}
// Connexion perdue : on retente pendant 45 s avant d'abandonner
function onLost(){
  if(kicked) return;
  if(!S){ connecting = false; renderHome(); return; }
  if(!reconnectUntil){ reconnectUntil = Date.now() + 45000; showModal("reconnect"); }
  if(Date.now() > reconnectUntil){ reconnectUntil = 0; tab.del("pd_room"); showModal("hostgone"); return; }
  clearTimeout(retryT);
  retryT = setTimeout(() => joinRoom(roomCode, true), 2500);
}

function act(a){
  AU.unlock();
  if(role === "host"){
    if(a.type === "react") return fxBroadcast(a.kind, myId);
    if(a.type === "kick" && conns[a.id]){ const c = conns[a.id]; try{ c.send({t:"kicked"}); }catch(e){} delete conns[a.id]; setTimeout(()=>{ try{ c.close(); }catch(e){} }, 400); }
    if(L.reduce(S, a, myId, Date.now())) changed();
  }
  else if(hostConn && hostConn.open) hostConn.send({t:"act", a});
}

/* ---------- Application de l'état + sons ---------- */
function sig(s){
  return { phase:s.phase, turn:s.turn, q:s.q, round:s.round, ridx:s.ridx, n:Object.keys(s.players).length,
           seated:Object.values(s.players).filter(p=>p.duo).map(p=>p.id+p.duo+p.slot).sort().join(","),
           signed:Object.keys(s.signed||{}).length, ov:JSON.stringify(s.overrides||{}) };
}
function applyState(s, rem){
  const prev = lastSig; S = s; localDeadline = rem!=null ? Date.now() + rem : null;
  const now = sig(S); lastSig = now;
  // Les fenêtres (bêtisier, question piège) se ferment quand l'écran change
  if(prev && (now.phase !== prev.phase || now.turn !== prev.turn) && (modal === "worst" || modal === "trap")) modal = null;
  render();
  if(!prev) return;
  if(now.n > prev.n) AU.sfx("join");
  if(now.phase === "lobby" && prev.phase === "lobby" && now.seated !== prev.seated){
    const newIds = now.seated.split(",").filter(x => x && !prev.seated.split(",").includes(x));
    newIds.forEach(x => { const sl = SLOTS.find(z => x.endsWith(z.duo + z.slot)); if(sl) camFlash(sl.x + 86, sl.y + 90); });
  }
  const turnStart = now.phase === "dossier" && (prev.phase !== "dossier" || now.turn !== prev.turn || now.round !== prev.round);
  if(turnStart) cineTurn();
  if(now.phase !== prev.phase){
    if(now.phase === "interro") cineInterro();
    if(now.phase === "reveal") cineReveal();
    if(now.phase === "roundEnd") AU.sfx("win");
    if(now.phase === "verdict"){ cineVerdict(); setTimeout(()=>AU.sfx("slam"), 900); setTimeout(()=>AU.sfx("siren"), 1500); setTimeout(()=>AU.speak(S.loser==="both" ? "Égalité. Tout le monde en cellule." : "Coupables ! Embarquez-moi ces deux-là."), 2200); }
  }
  if(now.phase === "interro" && (now.phase !== prev.phase || now.q !== prev.q || now.turn !== prev.turn)){
    const delay = now.phase !== prev.phase ? 1900 : 0;
    setTimeout(() => { AU.sfx("ding"); speakQuestion(); }, delay);
  }
  if(now.phase === "interro" && now.signed > prev.signed && now.q === prev.q) AU.sfx("type");
  if(now.phase === "reveal" && (now.phase !== prev.phase || now.turn !== prev.turn || now.ridx !== prev.ridx || now.ov !== prev.ov)){
    const {q, duo} = L.stepInfo(S.ridx, S); const ok = L.matchOf(S, S.round, q, duo);
    const base = now.phase !== prev.phase ? 1700 : 0;
    if(now.ov !== prev.ov && now.ridx === prev.ridx && now.phase === prev.phase){ AU.sfx(ok ? "match" : "fail"); }
    else {
      setTimeout(() => AU.sfx("flip"), base + 900); setTimeout(() => AU.sfx("flip"), base + 1900);
      setTimeout(() => AU.sfx(ok ? "match" : "fail"), base + 2800);
    }
  }
}

/* ---------- Cinématiques ---------- */
function cinema(inner, dur){
  const el = document.createElement("div");
  el.className = "cine"; el.style.setProperty("--dur", (dur||1800) + "ms");
  el.innerHTML = `<div class="bar t"></div><div class="bar b"></div><div class="card">${inner}</div>`;
  fxLayer.appendChild(el); AU.sfx("whoosh");
  setTimeout(() => el.remove(), (dur||1800) + 50);
}
function faces(duo){ return `<div class="faces">${L.members(S, duo).map(p=>`<div><div class="ph ${duo}">${A.portrait(p.av, "neutral", 104, 106)}</div></div>`).join("")}</div>`; }
function cineTurn(){
  const duo = S.turn, sc = L.scenOf(S, S.round, duo), nm = namesFor(duo);
  cinema(`<div class="kicker">MANCHE ${S.round+1} / ${L.CFG.ROUNDS} · AFFAIRE N° ${String(46+S.round*2+(duo==="B"?2:1)).padStart(3,"0")}</div>
    <div class="big" style="font-size:${sc.titre.length>18?72:92}px">${esc(sc.titre.toUpperCase())}</div>
    ${faces(duo)}<div class="sub">${esc(nm.A)} & ${esc(nm.B)}, à vous de jouer.</div>`, 2300);
  setTimeout(() => AU.sfx("paper"), 500);
}
function cineInterro(){
  const nm = namesFor(S.turn);
  cinema(`<div class="kicker">SALLE D'INTERROGATOIRE N°2</div><div class="big">L'INTERROGATOIRE</div>
    <div class="sub">${esc(nm.A)} et ${esc(nm.B)} sont séparés. Plus un mot.</div>`, 1900);
  setTimeout(() => AU.sfx("door"), 250);
}
function cineReveal(){
  cinema(`<div class="kicker">LES DÉPOSITIONS VONT PARLER</div><div class="big" style="color:#FFC23D">CONFRONTATION</div>${faces(S.turn)}`, 1700);
}
function cineVerdict(){
  cinema(`<div class="flash"></div><div class="kicker">LE COMMISSARIAT A TRANCHÉ</div><div class="big">VERDICT</div>`, 1600);
  setTimeout(() => AU.sfx("shutter"), 80);
}
function camFlash(x, y){
  const el = document.createElement("div"); el.className = "camflash";
  el.style.setProperty("--x", x + "px"); el.style.setProperty("--y", y + "px");
  fxLayer.appendChild(el); AU.sfx("shutter"); setTimeout(() => el.remove(), 600);
}
function setTalking(on){ screen.classList.toggle("talking", !!on); }

/* ---------- Helpers ---------- */
const me = () => S && S.players[myId];
const isHost = () => role === "host";
function namesFor(duo){ return L.duoNames(S, duo || "A"); }
function myDuo(){ const p = me(); return (p && p.duo) || "A"; }
function questionText(r, q, duo){
  if(q >= 10){ const x = S.extra && S.extra[r+"-"+duo]; return x ? x.text : ""; }
  const sc = L.scenOf(S, r, duo); return sc ? L.fmt(sc.questions[q], namesFor(duo)) : "";
}
function trapBy(r, duo){ const x = S.extra && S.extra[r+"-"+duo]; return x && S.players[x.by] ? S.players[x.by].name : null; }
function reactBar(vertical){
  return `<div style="display:flex;${vertical?"flex-direction:column;":""}gap:6px">${Object.entries(REACTS).map(([k,t])=>`<button type="button" class="btn small ${k==="menteur"?"red":k==="mdr"?"yellow":"cream"}" data-act="react" data-k="${k}" style="font-size:13px;padding:4px 10px">${t}</button>`).join("")}</div>`;
}
function bold(t){ return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
function speakQuestion(){
  const t = questionText(S.round, S.q, S.turn);
  setTimeout(() => AU.speak(t, {onstart:()=>setTalking(true), onend:()=>setTalking(false)}), 300);
}
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
  const sk = [S.phase, S.round, S.turn, S.phase==="reveal" ? S.ridx : "", S.phase==="interro" ? S.q : ""].join("|");
  const ov = S.phase === "reveal" ? JSON.stringify(S.overrides) : "";
  const still = sk === lastScreenKey;
  screen.className = "layer" + (still ? " still" : "") + (still && ov !== lastOv ? " restamp" : "");
  lastScreenKey = sk; lastOv = ov;
  screen.innerHTML = fn() + SC.grainLayer("g" + S.phase) + modalHtml() + `<div id="toast"></div>`;
  if(S.phase === "roundEnd" && !still) countUp();
  if(modal === "reconnect") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:36px">Connexion perdue…</h2>
    <p style="margin:0;font-weight:800">On te reconnecte au commissariat, ne ferme pas la page.</p>
    <div class="lil pulse" style="font-size:22px;color:#D7262E">RECONNEXION EN COURS</div></div></div>`;
  if(modal === "kicked") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:38px">Tu as été viré du commissariat</h2>
    <p style="margin:0;font-weight:800">L'hôte t'a retiré de la salle.</p>
    <button class="btn red" data-act="home">RETOUR À L'ACCUEIL</button></div></div>`;
  if(modal === "trap"){ const ti = $("#trapInput"); if(ti){ ti.focus(); ti.setSelectionRange(ti.value.length, ti.value.length); } }
  else if(S.phase === "interro"){ const inp = $("#answer"); if(inp && !S.signed[myId]) setTimeout(()=>inp.focus(), 50); }
  tickTimers(true);
}

/* Accueil */
function renderHome(){
  screen.className = "layer"; lastScreenKey = "";
  const avs = A.PICKABLE.map(a => `<button type="button" data-act="av" data-v="${a.id}" aria-label="${a.nom}" style="width:100%;height:74px;padding:0;border:4px solid ${INK};border-radius:12px;background:${a.id===myAv?"#FFC23D":"#E9DFCB"};box-shadow:${a.id===myAv?"0 0 0 4px #FFC23D, 0 5px 0 "+INK:"0 5px 0 "+INK};overflow:hidden;display:flex;align-items:flex-end;justify-content:center;transform:${a.id===myAv?"translateY(-4px)":"none"}">${A.portrait(a.id, a.id===myAv?"happy":"neutral", 66, 70)}</button>`).join("");
  screen.innerHTML = SC.precinct(false) + SC.title(true) + `
  <div class="popIn" style="position:absolute;left:290px;top:186px;width:700px;background:#FFF8EA;border:6px solid ${INK};border-radius:22px;box-shadow:0 10px 0 ${INK},0 30px 60px rgba(0,0,0,.5);padding:22px 30px 26px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="typew" style="font-size:15px;color:#6B6355">FICHE D'IDENTITÉ · SUSPECT</div>
      <div class="lil" style="font-size:20px;color:#D7262E;border:4px solid #D7262E;border-radius:8px;padding:0 10px;transform:rotate(6deg)">À COMPLÉTER</div>
    </div>
    <label for="nm" style="font-weight:900;font-size:14px;letter-spacing:2px">TON NOM DE CODE</label>
    <input id="nm" class="input" maxlength="16" placeholder="Ex : Camille" value="${esc(myName)}" autocomplete="off">
    <div style="font-weight:900;font-size:14px;letter-spacing:2px">TA TÊTE DE SUSPECT</div>
    <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px">${avs}</div>
    <div style="display:flex;gap:16px;align-items:stretch;margin-top:6px">
      ${urlCode ? `
        <button class="btn red" data-act="join" style="flex:1;font-size:26px"${connecting?" disabled":""}><span class="shine"></span><span class="t">${connecting?connectMsg:"REJOINDRE LA SALLE "+esc(urlCode)}</span></button>
        <button class="btn cream small" data-act="forget" style="font-size:15px">Autre salle</button>` : `
        <button class="btn red" data-act="create" style="flex:1.1;font-size:24px"${connecting?" disabled":""}><span class="shine"></span><span class="t">${connecting?connectMsg:"CRÉER UNE SALLE"}</span></button>
        <div style="flex:1;display:flex;gap:8px">
          <input id="code" class="input" maxlength="4" placeholder="CODE" aria-label="Code de la salle" style="text-transform:uppercase;letter-spacing:6px;text-align:center;font-size:24px;padding:8px">
          <button class="btn" data-act="join" style="font-size:20px;padding:8px 16px"${connecting?" disabled":""}>GO</button>
        </div>`}
    </div>
  </div>` + homeSuspects() + SC.tape() + SC.grainLayer("gh") + `<div id="toast"></div>`;
}
// Avis de recherche de chaque côté de la fiche
function homeSuspects(){
  const W = [[2,"sad",30,210,-7,"#BFD4F2"],[6,"smirk",64,436,5,"#F7C6C0"],[11,"shocked",1062,196,6,"#F7C6C0"],[12,"confused",1030,430,-5,"#BFD4F2"]];
  return W.map(([av,ex,x,y,r,bg],i)=>`<div class="sway2" style="--r:${r}deg;position:absolute;left:${x}px;top:${y}px;width:178px;background:#FFF8EA;border:4px solid ${INK};padding:8px 8px 6px;box-shadow:6px 8px 0 rgba(5,8,15,.55);animation-delay:${-i*1.3}s">
    <div class="pin" style="background:${i%2?"#FF5A5F":"#FFC23D"}"></div>
    <div class="lil" style="text-align:center;font-size:20px;color:#D7262E;letter-spacing:2px">RECHERCHÉ</div>
    <div style="height:150px;border:3px solid ${INK};background:repeating-linear-gradient(180deg,${bg} 0 22px,rgba(0,0,0,.06) 22px 24px);overflow:hidden;display:flex;align-items:flex-end;justify-content:center">${A.portrait(av, ex, 148, 146)}</div>
    <div class="typew" style="text-align:center;font-size:13px;margin-top:4px">SUSPECT N°${String(40+i*7).padStart(3,"0")}</div></div>`).join("");
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
    ${standing.length ? `<div style="position:absolute;left:20px;top:150px;display:flex;flex-direction:column;gap:6px;max-width:200px"><div class="lil" style="color:#FFC23D;font-size:15px">SPECTATEURS :</div><div style="font-weight:800;font-size:12px;color:#C9D2E3">Ils parient et posent des pièges</div>${standing.map(p=>`<div class="chip"><div class="dot">${A.portrait(p.av,"neutral",30,30)}</div>${esc(p.name)}</div>`).join("")}</div>` : ""}
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
const PARA_EVERY = 7; // secondes entre deux paragraphes dévoilés
function renderDossier(){
  const duo = S.turn, names = namesFor(duo), sc = L.scenOf(S, S.round, duo);
  const p = me(), playing = p && p.duo === duo, ready = playing && p.ready;
  const partner = L.members(S, duo).find(x => x.id !== myId);
  const num = S.round*2 + (duo==="B"?2:1);
  const trap = S.extra[S.round+"-"+duo];
  const readyDots = L.members(S, duo).map(x => `<div title="${esc(x.name)}" style="width:38px;height:38px;border-radius:50%;border:3px solid ${INK};overflow:hidden;background:${x.ready?"#6FD6B8":"#E9DFCB"};position:relative">${A.portrait(x.av, x.ready?"happy":"neutral", 38, 38)}${x.ready?`<div style="position:absolute;right:-2px;bottom:-2px;width:16px;height:16px;border-radius:50%;background:#2EA35A;border:2px solid ${INK}"></div>`:""}</div>`).join("");
  const elapsed = L.CFG.PREP_MS/1000 - remaining()/1000;
  const paras = sc.recit.map((t,i)=>`<p class="para${elapsed >= i*PARA_EVERY ? " on" : ""}" data-at="${i*PARA_EVERY}" style="margin:0;font-size:19px;line-height:1.38">${bold(L.fmt(t, names))}</p>`).join("");
  return SC.desk(false) + `
  ${SC.deskLight()}
  <div class="dropIn" style="--r:-1deg;position:absolute;left:150px;top:26px;width:620px;height:668px;background:#E8D3AE;background-image:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.35),transparent 60%),radial-gradient(ellipse at 80% 90%,rgba(120,80,30,.18),transparent 60%);box-shadow:0 18px 40px rgba(0,0,0,.45),inset 0 0 60px rgba(120,80,30,.25);padding:34px 46px;display:flex;flex-direction:column;gap:16px;color:#3A2A18;font-family:'Special Elite',monospace">
    <div style="text-align:center;display:flex;flex-direction:column;gap:2px">
      <div style="font-size:34px;font-weight:700;letter-spacing:1px">Alibi #${num}</div>
      <div style="font-size:22px;font-weight:700">${esc(names.A)} et ${esc(names.B)}</div>
      <div style="letter-spacing:4px">----------</div>
    </div>
    ${paras}
    <div class="marker" style="margin-top:auto;font-size:19px;color:#B3261E;transform:rotate(-2deg);text-align:right">Le reste ? C'est à vous de l'inventer.</div>
    <div class="lil" style="position:absolute;right:26px;top:24px;font-size:20px;color:#B3261E;border:4px solid #B3261E;border-radius:8px;padding:0 10px;transform:rotate(9deg);opacity:.7;mix-blend-mode:multiply">CONFIDENTIEL</div>
    <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120" style="position:absolute;left:-30px;bottom:-26px;opacity:.35"><circle cx="60" cy="60" r="46" fill="none" stroke="#6B3E1F" stroke-width="9"/><circle cx="64" cy="57" r="40" fill="none" stroke="#6B3E1F" stroke-width="3"/></svg>
  </div>
  <div class="dropIn" style="--r:2deg;position:absolute;left:820px;top:150px;width:400px;background:#FFF8EA;border:5px solid ${INK};border-radius:10px;box-shadow:0 10px 0 rgba(21,19,31,.35);padding:16px 20px;display:flex;flex-direction:column;gap:8px;animation-delay:.15s">
    <div style="display:flex;justify-content:space-between;align-items:center"><div class="typew" style="font-size:13px;color:#6B6355">AFFAIRE N° ${String(46+num).padStart(3,"0")} · ${esc(sc.heure.toUpperCase())}</div><div class="lil" style="font-size:15px;color:#D7262E;border:3px solid #D7262E;border-radius:6px;padding:0 6px;transform:rotate(6deg)">PLAINTE</div></div>
    <h1 class="lil" style="margin:0;font-size:32px;line-height:1;color:#16213A">${esc(sc.titre)}</h1>
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex:none;width:118px;background:#FFF;border:3px solid ${INK};padding:5px 5px 3px;transform:rotate(-4deg)">
        <div style="height:62px;background:#2A2048;border:2px solid ${INK};overflow:hidden"><svg aria-hidden="true" width="104" height="58" viewBox="0 0 204 112"><defs><radialGradient id="spot" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#FF7BD5" stop-opacity=".7"/><stop offset="1" stop-color="#FF7BD5" stop-opacity="0"/></radialGradient></defs><rect width="204" height="112" fill="url(#spot)"/><rect y="86" width="204" height="26" fill="#3B2A5E"/><rect x="72" y="20" width="60" height="60" rx="8" fill="none" stroke="#FFF8EA" stroke-width="5" stroke-dasharray="9 7"/><text x="102" y="64" text-anchor="middle" font-family="Lilita One" font-size="34" fill="#FFC23D">?</text></svg></div>
        <div class="marker" style="font-size:11px;text-align:center;line-height:1.2">${esc(sc.photo)}</div>
      </div>
      <p class="typew" style="margin:0;font-size:15px;line-height:1.35">${esc(L.fmt(sc.pitch, names))}</p>
    </div>
    <div style="border-top:3px dashed #B9A88A;padding-top:8px;font-weight:900;font-size:15px;line-height:1.35">${playing
      ? `Filez en vocal privé avec <span style="color:#2F5DA8">${esc(partner?partner.name:"ton binôme")}</span> et inventez tout ce qui n'est pas écrit : l'inspecteur va creuser <u>entre les lignes</u>.`
      : `Le Duo ${duo} invente son alibi en privé. Toi, tu peux préparer une <span style="color:#D7262E">question piège</span> que l'inspecteur leur posera.`}</div>
    ${!playing ? (trap ? `<div class="marker" style="font-size:15px;background:#FFE066;border:3px solid ${INK};padding:4px 8px;transform:rotate(-1deg)">Question piège de ${esc(trapBy(S.round,duo)||"?")} : « ${esc(trap.text)} »</div>`
                       : `<button class="btn small red" data-act="trapOpen" style="font-size:15px;align-self:flex-start">🎯 ÉCRIRE LA QUESTION PIÈGE</button>`) : ""}
  </div>
  <div style="position:absolute;left:860px;top:590px">${SC.stopwatch()}</div>
  <div style="position:absolute;left:980px;top:604px;display:flex;flex-direction:column">
    <div style="font-weight:900;font-size:14px;letter-spacing:2px;color:#FFE7A8">PRÉPARATION</div>
    <div class="lil tick" data-timer style="font-size:56px;line-height:1;color:#FFF8EA;text-shadow:0 5px 0 ${INK},0 0 24px rgba(255,90,95,.6)">--</div>
  </div>
  <div style="position:absolute;right:24px;top:22px;display:flex;align-items:center;gap:10px">
    ${isHost() ? `<button class="btn small cream" data-act="next" style="font-size:13px">Lancer l'interrogatoire</button>` : ""}
    <div style="display:flex;gap:6px;background:rgba(21,19,31,.55);padding:6px;border-radius:99px">${readyDots}</div>
    ${playing ? `<button class="btn ${ready?"green":"red"}" data-act="ready" style="font-size:22px">${ready?"✓ PRÊT !":"ON EST PRÊTS"}</button>`
              : `<div class="lil" style="font-size:18px;background:#FFC23D;border:4px solid ${INK};border-radius:14px;padding:6px 14px;box-shadow:0 5px 0 ${INK}">TU OBSERVES</div>`}
  </div>`;
}

/* Interrogatoire */
function chipsHtml(){
  const ps = L.members(S, S.turn);
  const chip = p => `<div class="chip" data-chip="${esc(p.id)}"><div class="dot">${A.portrait(p.av, S.signed[p.id]?"smirk":"neutral", 30, 30)}</div>${esc(p.name)}<div class="tag" style="background:${S.signed[p.id]?"#6FD6B8":"#FFC23D"}">${S.signed[p.id]?"SIGNÉ":"TAPE…"}</div></div>`;
  return `<div style="position:absolute;left:24px;bottom:18px;display:flex;flex-direction:column;gap:8px">
      <div class="lil" style="font-size:14px;color:#FFC23D;text-shadow:0 2px 0 ${INK}">EN INTERROGATOIRE · DUO ${S.turn}</div>${ps.map(chip).join("")}</div>`;
}
// Ce que les spectateurs voient derrière le miroir : les réponses en direct
function liveHtml(){
  const m = L.members(S, S.turn), ans = S.answers[S.round+"-"+S.q] || {};
  const both = m.length===2 && m.every(p=>S.signed[p.id]);
  const ok = both && L.isMatch(ans[m[0].id], ans[m[1].id]);
  const slip = p => `<div style="flex:1;min-width:0;background:#FFF8EA;border:3px solid ${INK};border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:center;gap:6px"><div style="width:30px;height:30px;border-radius:50%;border:2px solid ${INK};overflow:hidden;background:#E9DFCB">${A.portrait(p.av, S.signed[p.id]?"smirk":"neutral", 30, 30)}</div><div style="font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div></div>
      <div class="typew" style="font-size:15px;line-height:1.2;min-height:36px;word-break:break-word">${S.signed[p.id] ? "« "+esc(ans[p.id]||"…")+" »" : `<span style="color:#9B9384">écrit…</span>`}</div></div>`;
  return `<div class="lil" style="font-size:15px;color:#FF5A5F;display:flex;align-items:center;gap:6px"><span class="pulse" style="width:10px;height:10px;border-radius:50%;background:#FF5A5F;display:inline-block"></span>EN DIRECT DU MIROIR</div>
    <div style="display:flex;gap:8px">${m.map(slip).join("")}</div>
    ${both ? `<div class="lil popIn" style="align-self:center;font-size:20px;color:${ok?"#6FD6B8":"#FF5A5F"};border:4px solid currentColor;border-radius:8px;padding:0 10px;transform:rotate(-4deg)">${ok?"ÇA COLLE":"ÇA COLLE PAS"}</div>` : `<div style="font-weight:800;font-size:12px;color:#C9D2E3;text-align:center">Eux ne voient rien. Toi, si.</div>`}`;
}
function betHtml(){
  const bk = S.round+"-"+S.turn+"-"+S.q, mine = (S.bets[bk]||{})[myId], closed = L.betsClosed(S);
  const b = (v, t) => `<button type="button" class="btn small ${mine===v?(v?"green":"red"):"cream"}${closed&&mine!==v?" closed":""}" data-act="bet" data-v="${v?1:0}" ${closed?"disabled":""} style="flex:1;font-size:15px">${t}${mine===v?" ✓":""}</button>`;
  return `<div style="font-weight:900;font-size:12px;letter-spacing:2px;color:#8A8172">${closed ? (mine===undefined ? "PARIS FERMÉS · TROP TARD !" : "PARI ENREGISTRÉ · PARIS FERMÉS") : "TON PARI AVANT LA 1RE SIGNATURE · PAREIL ?"}</div>
    <div style="display:flex;gap:8px">${b(true,"PAREIL")}${b(false,"PAS PAREIL")}</div>`;
}
function renderInterro(){
  const duo = S.turn, qt = questionText(S.round, S.q, duo), signed = !!S.signed[myId];
  const playing = me() && me().duo === duo, isTrap = S.q >= 10;
  const total = L.nq(S, S.round, duo);
  const dots = Array.from({length:total},(_,i)=> i===S.q
      ? `<div class="lil" style="width:30px;height:30px;border-radius:50%;background:${i>=10?"#FF5A5F":"#FFC23D"};border:4px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:16px">${i>=10?"!":i+1}</div>`
      : `<div style="width:22px;height:22px;border-radius:50%;background:${i<S.q?"#6FD6B8":(i>=10?"#8A2A2E":"#2E4650")};border:3px solid ${INK}"></div>`).join("");
  const nm = L.duoNames(S,duo), rx = x => x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const highlight = esc(qt).replace(new RegExp("("+rx(esc(nm.A))+"|"+rx(esc(nm.B))+")","g"), `<span style="color:#FF5A5F">$1</span>`);
  const trap = S.extra[S.round+"-"+duo];
  return SC.room(playing ? "LE DUO " + (duo==="A"?"B":"A") + " OBSERVE" : "TOI, TU OBSERVES") + `
  <div id="fuse" style="width:100%"></div>
  <div style="position:absolute;left:30px;top:22px"><div class="lil" style="font-size:20px;background:#FFC23D;border:4px solid ${INK};border-radius:12px;padding:2px 14px;box-shadow:0 4px 0 ${INK}">MANCHE ${S.round+1} · DUO ${duo}</div></div>
  <div style="position:absolute;left:270px;top:26px;display:flex;gap:7px;align-items:center">${dots}</div>
  <div class="popIn" style="position:absolute;left:380px;top:96px;width:460px">
    <div style="position:relative;background:${isTrap?"#FFE066":"#FFF8EA"};border:6px solid ${INK};border-radius:34px;padding:22px 30px 26px;box-shadow:0 8px 0 ${INK}">
      <div style="display:flex;align-items:center;gap:10px"><div class="marker" style="font-size:18px;color:${isTrap?"#D7262E":"#2F5DA8"}">${isTrap ? "Question piège de " + esc(trapBy(S.round,duo)||"?") : "Inspecteur Moustache"}</div><div style="height:3px;flex:1;background:#E9DFCB"></div>
        <button type="button" data-act="repeat" aria-label="Répéter la question" style="border:3px solid ${INK};border-radius:50%;width:34px;height:34px;background:#FFC23D;font-weight:900">🔊</button></div>
      <div class="lil typeq" style="font-size:${qt.length>70?28:34}px;line-height:1.12;color:#16213A;word-break:break-word">${highlight}</div>
    </div>
    <svg aria-hidden="true" width="80" height="60" viewBox="0 0 80 60" style="position:absolute;left:-46px;top:120px"><path d="M76 6 L6 50 L70 34" fill="${isTrap?"#FFE066":"#FFF8EA"}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="62" y="8" width="18" height="24" fill="${isTrap?"#FFE066":"#FFF8EA"}"/></svg>
  </div>
  <div style="position:absolute;right:26px;top:16px;display:flex;align-items:center;gap:4px;background:#16213A;border:4px solid ${INK};border-radius:20px;padding:6px 18px 6px 8px;box-shadow:0 5px 0 #05080F;z-index:2">
    ${SC.stopwatch().replace('width="110" height="122"','width="58" height="64"')}
    <div class="lil" id="tnum" data-timer style="font-size:46px;color:#FF5A5F;line-height:1;text-shadow:0 0 18px rgba(255,90,95,.7);min-width:56px;text-align:center">--</div>
    <div style="font-weight:900;font-size:13px;color:#C9D2E3;margin-left:4px">SEC</div>
  </div>
  ${playing ? `
  <form id="ansForm" style="position:absolute;left:486px;top:478px;width:330px;display:flex;flex-direction:column;gap:4px">
    <label for="answer" style="font-weight:900;font-size:12px;letter-spacing:2px;color:#8A8172">TA DÉPOSITION · SECRÈTE</label>
    <input id="answer" type="text" maxlength="80" autocomplete="off" ${signed?"disabled":""} placeholder="${signed?"":"Tape ta réponse…"}" value="${esc(myAnswers[S.round+"-"+S.q]||(signed?"Déposition signée":""))}" style="font-family:'Special Elite',monospace;font-size:20px;background:transparent;border:none;border-bottom:3px solid ${INK};padding:2px 0;color:${INK};outline:none">
  </form>
  <button type="button" data-act="sign" id="signBtn" ${signed?"disabled":""} style="position:absolute;left:880px;top:470px;width:130px;height:130px;border-radius:50%;font-family:'Lilita One';font-size:26px;letter-spacing:1px;background:${signed?"#6B6355":"#2EA35A"};color:#FFF8EA;border:6px solid ${INK};box-shadow:0 8px 0 ${INK},inset 0 -8px 0 rgba(0,0,0,.18);transform:rotate(-8deg)">${signed?"SIGNÉ ✓":"SIGNER"}</button>
  ${signed ? `<div class="lil stampIn" style="--r:-12deg;position:absolute;left:560px;top:500px;font-size:40px;color:#2EA35A;border:6px solid #2EA35A;border-radius:12px;padding:0 14px;background:rgba(255,255,255,.6);animation-delay:0s">SIGNÉ</div>` : ""}`
  : `
  <div id="live" style="position:absolute;left:884px;top:118px;width:344px;display:flex;flex-direction:column;gap:8px;background:rgba(10,18,26,.82);border:3px solid #9AA6B8;border-radius:10px;padding:10px">${liveHtml()}</div>
  <div id="bet" style="position:absolute;left:486px;top:478px;width:330px;display:flex;flex-direction:column;gap:6px">${betHtml()}</div>
  <div style="position:absolute;right:30px;top:440px;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
    ${trap ? `<div class="marker" style="max-width:260px;font-size:13px;background:#FFE066;border:3px solid ${INK};padding:3px 8px">Piège prévu : « ${esc(trap.text)} »</div>`
           : (S.q < 9 ? `<button class="btn small red" data-act="trapOpen" style="font-size:14px">🎯 QUESTION PIÈGE</button>` : "")}
    ${reactBar(false).replace('display:flex;gap:6px','display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:380px')}
  </div>`}
  <div id="chips">${chipsHtml()}</div>`;
}
function patchInterro(){
  const c = $("#chips"); if(c) c.innerHTML = chipsHtml();
  const lv = $("#live"); if(lv) lv.innerHTML = liveHtml();
  const bt = $("#bet"); if(bt) bt.innerHTML = betHtml();
  if(S.signed[myId]){ const inp = $("#answer"); if(inp && !inp.disabled){ lastKey = ""; render(); } }
  tickTimers(true);
}

/* Révélation */
const LINES_OK = ["Hmm… ça colle. Pour l'instant.","Bien répété, les loulous.","Mêmes versions. Suspect.","Je note. Concordant."];
const LINES_KO = ["Tiens tiens… intéressant.","Quelqu'un ment dans cette pièce.","Ah. Ça ne colle pas du tout.","Je le savais !"];
// Éclaboussures (contradiction) ou confettis (concordant) au coup de tampon
function burst(ok, d){
  const cols = ok ? ["#6FD6B8","#FFC23D","#9FD3FF","#FF9AA8","#FFF8EA"] : ["#D7262E","#B3261E","#15131F","#FF5A5F"];
  let h = "";
  for(let i=0;i<26;i++){
    const ang = Math.random()*Math.PI*2, dist = 120 + Math.random()*260;
    const dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist*0.75 - (ok?80:0);
    const sz = ok ? 10+Math.random()*10 : 8+Math.random()*22;
    h += `<div class="burstP" style="--x0:${640-sz/2}px;--y0:${470-sz/2}px;--s:${sz}px;--c:${cols[i%cols.length]};--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--rot:${(Math.random()*720-360).toFixed(0)}deg;--br:${ok?(i%2?"3px":"50%"):"50% 40% 55% 45%"};--d:${d}s"></div>`;
  }
  return `<div class="layer" style="pointer-events:none;z-index:4">${h}</div>`;
}
function renderReveal(){
  const {q, duo} = L.stepInfo(S.ridx, S), m = L.members(S, duo), ans = S.answers[S.round+"-"+q] || {};
  const ok = L.matchOf(S, S.round, q, duo), sc = L.scores(S).total;
  const k = S.round+"-"+q+"-"+duo, over = k in S.overrides;
  const canOverride = !!(me() && me().duo !== duo); // seul l'autre duo (ou un spectateur) conteste
  const T0 = S.ridx === 0 ? 1.7 : 0; // laisse passer la carte titre au 1er passage
  const line = (ok?LINES_OK:LINES_KO)[(S.ridx+S.round)%4];
  const card = (p, i) => {
    const expr = ok ? "happy" : (i===0 ? "smirk" : "confused"), a = p ? ans[p.id] : "";
    return `<div class="dropIn" style="--r:${i?3:-4}deg;animation-delay:${T0+i*.12}s;position:absolute;left:${i?744:184}px;top:176px;width:352px;height:380px;background:#FFF8EA;border:5px solid ${INK};box-shadow:0 10px 0 rgba(21,19,31,.35);padding:20px 24px;display:flex;flex-direction:column;gap:12px">
      <div style="position:absolute;left:116px;top:-30px;width:110px;height:46px;background:#C9D2E3;border:5px solid ${INK};border-radius:10px 10px 4px 4px"></div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:132px;height:150px;background:#FFF;border:4px solid ${INK};padding:6px 6px 18px;transform:rotate(${i?3:-3}deg);box-shadow:3px 5px 0 rgba(21,19,31,.3)"><div class="ph ${duo}" style="position:relative;width:100%;height:100%;border:2px solid ${INK};overflow:hidden;display:flex;align-items:flex-end;justify-content:center">
          <div class="inkIn" style="--d:${T0+2.8}s;position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center">${portrait(p, expr, 112, 116)}</div>
          <div class="seal" style="--d:${T0+2.8}s;border:none;border-radius:0;background:none;opacity:0"><div style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center">${portrait(p, "neutral", 112, 116)}</div></div></div></div>
        <div style="display:flex;flex-direction:column;min-width:0"><div class="typew" style="font-size:14px;color:#6B6355">DÉPOSITION DE</div><div class="lil" style="font-size:30px;line-height:1;word-break:break-word">${esc(p?p.name:"?")}</div><div class="marker" style="font-size:15px;color:#2F5DA8">Duo ${duo}</div></div>
      </div>
      <div style="height:0;border-top:3px dashed #B9A88A"></div>
      <div style="position:relative;flex:1;min-height:110px">
        <div class="typew inkIn" style="--d:${T0+.9+i}s;font-size:${(a||"").length>40?24:30}px;line-height:1.25;word-break:break-word">${a ? "« "+esc(a)+" »" : `<span style="color:#9B9384">(silence total…)</span>`}</div>
        <div class="seal" style="--d:${T0+.9+i}s"><span>SCELLÉ</span></div>
      </div>
      <div class="marker" style="font-size:17px;color:#6B6355">Signé : ${esc(p?p.name:"?")}</div>
    </div>`;
  };
  return `<div class="layer shakeOnce" style="--d:${T0+2.8}s">` + SC.burst() + `
  <div style="position:absolute;left:0;right:0;top:0;height:104px;background:#16213A;border-bottom:6px solid ${INK};display:flex;align-items:center;justify-content:space-between;padding:0 40px">
    <div style="display:flex;align-items:center;gap:18px;min-width:0">
      <div class="lil" style="font-size:22px;background:#FF5A5F;color:#FFF8EA;border:4px solid ${INK};border-radius:12px;padding:4px 14px;transform:rotate(-3deg)">CONFRONTATION</div>
      <div style="display:flex;flex-direction:column;min-width:0"><div style="font-weight:900;font-size:14px;letter-spacing:2px;color:#9FD3FF">DUO ${duo} · MANCHE ${S.round+1} · ${q>=10 ? "QUESTION PIÈGE DE "+esc((trapBy(S.round,duo)||"?").toUpperCase()) : "QUESTION "+(q+1)+" / 10"}</div>
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
    <g class="late" style="--d:${T0+2.8}s;transform-box:fill-box;transform-origin:center"><g class="wob"><g transform="translate(640 372)"><circle r="52" fill="${ok?"#2EA35A":"#FF5A5F"}" stroke="${INK}" stroke-width="7"/><path d="M-30 -36 A46 46 0 0 1 30 -36" stroke="#FFF" stroke-opacity=".4" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-24 -12 H24 M-24 12 H24" stroke="#FFF8EA" stroke-width="9" stroke-linecap="round"/>${ok?"":`<path d="M14 -30 L-14 30" stroke="#FFF8EA" stroke-width="9" stroke-linecap="round"/>`}</g></g></g>
  </svg>
  ${burst(ok, T0+2.8)}
  <div class="stampIn" style="--r:-8deg;animation-delay:${T0+2.5}s;position:absolute;left:390px;top:506px;width:500px;height:96px;border:9px solid ${ok?"#1E7A41":"#D7262E"};border-radius:16px;background:rgba(255,248,234,.35);mix-blend-mode:multiply;display:flex;align-items:center;justify-content:center;pointer-events:none">
    <div class="lil" style="font-size:${ok?58:60}px;color:${ok?"#1E7A41":"#D7262E"};letter-spacing:3px">${ok?"CONCORDANT":"CONTRADICTION"}</div></div>
  ${over ? `<div class="marker" style="position:absolute;left:560px;top:612px;background:#FFF8EA;border:3px solid ${INK};padding:2px 10px;transform:rotate(-4deg);font-size:15px">Décision contestée !</div>` : ""}
  ${(()=>{ const bets = S.bets[S.round+"-"+duo+"-"+q] || {}; const ids = Object.keys(bets).filter(id=>S.players[id]);
      if(!ids.length) return "";
      return `<div style="position:absolute;left:400px;top:116px;display:flex;gap:8px;z-index:3">${ids.map(id=>{ const good = bets[id]===ok; return `<div class="chip late" style="--d:${T0+3.3}s;background:${good?"#1E7A41":"#8A2A2E"}"><div class="dot">${A.portrait(S.players[id].av, good?"happy":"sad", 30, 30)}</div>${esc(S.players[id].name)} : ${bets[id]?"PAREIL":"PAS PAREIL"} ${good?"✓":"✗"}</div>`; }).join("")}</div>`; })()}
  <div style="position:absolute;left:460px;bottom:14px">${reactBar(false)}</div>
  <div style="position:absolute;left:24px;bottom:16px;display:flex;align-items:flex-end;gap:10px">${A.inspectorHead(112,116)}<div class="late" style="--d:${T0+3.1}s"><div class="bob marker" style="margin-bottom:30px;background:#FFF8EA;border:4px solid ${INK};border-radius:18px 18px 18px 4px;padding:8px 16px;font-size:19px;box-shadow:0 5px 0 ${INK}">${line}</div></div></div>
  <div style="position:absolute;right:70px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:10px">
    ${canOverride ? `<button class="btn small ${ok?"cream":"yellow"}" data-act="override" style="font-size:15px">${ok?"✋ ÇA COMPTE PAS !":"✋ ÇA COMPTE QUAND MÊME"}</button>` : ""}
    ${isHost() ? `<button class="btn" data-act="next" style="font-size:24px">SUIVANT → <span data-timer style="font-size:16px;opacity:.7"></span></button>` : `<div class="lil" style="background:rgba(21,19,31,.75);color:#FFF8EA;border-radius:12px;padding:6px 14px;font-size:16px">Suite dans <span data-timer></span> s</div>`}
  </div></div>`;
}

/* Fin de manche */
function renderRoundEnd(){
  const {total, per} = L.scores(S), r = per[S.round] || {A:0,B:0};
  const nm = d => L.members(S,d).map(p=>esc(p.name)).join(" & ");
  const lead = total.A===total.B ? "Égalité parfaite. L'inspecteur transpire." : `Le Duo ${total.A<total.B?"A":"B"} sent déjà la cellule…`;
  return SC.burst() + `
  <div class="popIn" style="position:absolute;left:250px;top:110px;width:780px;background:#FFF8EA;border:6px solid ${INK};border-radius:24px;box-shadow:0 12px 0 ${INK};padding:28px 36px;display:flex;flex-direction:column;gap:18px;align-items:center">
    <div class="typew" style="font-size:16px;color:#6B6355">RAPPORT INTERMÉDIAIRE</div>
    <h1 class="lil" style="margin:0;font-size:56px;color:#16213A">FIN DE LA MANCHE ${S.round+1} / ${L.CFG.ROUNDS}</h1>
    <div style="display:flex;gap:30px;width:100%">
      ${["A","B"].map(d=>`<div style="flex:1;border:5px solid ${INK};border-radius:18px;background:${d==="A"?"#BFD4F2":"#F7C6C0"};padding:14px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="display:flex;gap:4px">${L.members(S,d).map(p=>`<div style="width:70px;height:70px;border-radius:50%;border:4px solid ${INK};overflow:hidden;background:#FFF8EA">${A.portrait(p.av, (d==="A"?total.A>=total.B:total.B>=total.A)?"happy":"sad", 70, 70)}</div>`).join("")}</div>
        <div class="marker" style="font-size:18px">${nm(d)}</div>
        <div class="lil" data-count="${total[d]}" data-from="${total[d]-r[d]}" style="font-size:64px;line-height:1;color:${d==="A"?"#2F5DA8":"#C4232D"}">${total[d]}</div>
        <div style="font-weight:900;font-size:14px;color:#6B6355">+${r[d]} cette manche</div></div>`).join("")}
    </div>
    <div class="marker" style="font-size:22px;color:#D7262E">${lead}</div>
    ${isHost() ? `<button class="btn red" data-act="next" style="font-size:26px"><span class="shine"></span><span class="t">MANCHE SUIVANTE (<span data-timer></span>)</span></button>` : `<div class="lil" style="font-size:20px">Manche suivante dans <span data-timer></span> s</div>`}
  </div>`;
}

function countUp(){
  document.querySelectorAll("[data-count]").forEach(el => {
    const to = +el.dataset.count, from = +el.dataset.from, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0 - 500) / 1200); if(k < 0){ el.textContent = from; return requestAnimationFrame(step); }
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if(k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  setTimeout(() => AU.sfx("clack"), 600);
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
  const max = Math.max(L.maxScore(S,"A"), L.maxScore(S,"B"));
  const bar = (d, v) => `<div style="display:flex;align-items:center;gap:12px"><div style="width:70px;font-weight:900;font-size:18px">Duo ${d}</div><div style="flex:1;height:22px;background:#E9DFCB;border:3px solid ${INK};border-radius:99px;overflow:hidden"><div style="width:${Math.round(v/L.maxScore(S,d)*100)}%;height:100%;background:${(S.loser===d||both)?"#FF5A5F":"#2EA35A"}"></div></div><div class="lil" style="width:40px;text-align:right;font-size:28px;color:${(S.loser===d||both)?"#C4232D":"#1E7A41"}">${v}</div></div>`;
  const ln = losers.map(p=>esc(p.name)).join(" & ");
  return SC.cellBack() + `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true">${figs}</svg>` + SC.cellFront() + `
  <div style="position:absolute;left:864px;right:36px;top:36px;bottom:62px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;gap:10px"><div class="pulse" style="width:12px;height:12px;border-radius:50%;background:#FF5A5F;box-shadow:0 0 12px #FF5A5F"></div><div style="font-weight:900;font-size:14px;color:#FFB3AE;letter-spacing:3px">VERDICT FINAL</div></div>
    <h1 class="neon" style="margin:0;font-family:'Stardos Stencil','Lilita One';font-weight:700;font-size:${both?46:56}px;line-height:.95;color:#FF5A5F;text-shadow:0 6px 0 #05080F,0 0 40px rgba(255,90,95,.45);transform:rotate(-3deg)">${both?"TOUS COUPABLES":"COUPABLES"}</h1>
    <div style="font-weight:800;font-size:18px;color:#E9DFCB;line-height:1.4">${both ? "Égalité parfaite : l'inspecteur embarque tout le monde." : `<span class="marker" style="color:#FFC23D">${ln}</span> partent en cellule.`}</div>
    ${winners.length ? `<div style="display:flex;align-items:center;gap:8px"><div class="lil" style="font-size:16px;color:#6FD6B8">LIBÉRÉS :</div>${winners.map(p=>`<div style="display:flex;align-items:center;gap:6px;background:#1E7A41;border:3px solid ${INK};border-radius:99px;padding:2px 10px 2px 2px;color:#FFF8EA;font-weight:900;font-size:14px"><div style="width:30px;height:30px;border-radius:50%;overflow:hidden;border:2px solid ${INK};background:#E9DFCB">${A.portrait(p.av,"happy",30,30)}</div>${esc(p.name)}</div>`).join("")}</div>` : ""}
    <div style="background:#FFF8EA;border:5px solid ${INK};border-radius:16px;box-shadow:0 7px 0 #05080F;padding:12px 18px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;font-weight:900;font-size:13px;letter-spacing:1px;color:#6B6355"><div>RÉPONSES IDENTIQUES</div><div>SUR ${max}</div></div>
      ${bar("A", total.A)}${bar("B", total.B)}
    </div>
    ${(()=>{ const f = L.flair(S); const best = Object.entries(f).filter(([id,v])=>S.players[id] && !S.players[id].bot && v.n >= 3).sort((a,b)=>(b[1].ok/b[1].n)-(a[1].ok/a[1].n) || b[1].ok-a[1].ok)[0];
      if(!best) return "";
      const bp = S.players[best[0]];
      return `<div style="display:flex;align-items:center;gap:10px;background:#16213A;border:4px solid #FFC23D;border-radius:14px;padding:8px 12px;color:#FFF8EA"><div style="width:44px;height:44px;border-radius:50%;border:3px solid #FFC23D;overflow:hidden;background:#E9DFCB">${A.portrait(bp.av,"happy",44,44)}</div><div><div class="lil" style="font-size:16px;color:#FFC23D">MEILLEUR INDIC</div><div style="font-weight:900;font-size:15px">${esc(bp.name)} · ${best[1].ok}/${best[1].n} paris réussis</div></div></div>`; })()}
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
function showModal(m){ modal = m; if(S) { const old = $(".modal"); if(old) old.remove(); screen.insertAdjacentHTML("beforeend", modalHtml()); } else render(); }
function modalHtml(){
  if(!modal) return "";
  if(modal === "hostgone") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:40px">L'hôte a quitté le commissariat</h2>
    <p style="margin:0;font-weight:800">La salle est fermée. Recréez-en une pour rejouer.</p>
    <button class="btn red" data-act="home">RETOUR À L'ACCUEIL</button></div></div>`;
  if(modal === "reconnect") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:36px">Connexion perdue…</h2>
    <p style="margin:0;font-weight:800">On te reconnecte au commissariat, ne ferme pas la page.</p>
    <div class="lil pulse" style="font-size:22px;color:#D7262E">RECONNEXION EN COURS</div></div></div>`;
  if(modal === "kicked") return `<div class="modal"><div class="sheet popIn" style="text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">
    <div style="width:120px">${A.inspectorHead(120,124)}</div>
    <h2 class="lil" style="margin:0;font-size:38px">Tu as été viré du commissariat</h2>
    <p style="margin:0;font-weight:800">L'hôte t'a retiré de la salle.</p>
    <button class="btn red" data-act="home">RETOUR À L'ACCUEIL</button></div></div>`;
  if(modal === "trap"){
    return `<div class="modal"><form id="trapForm" class="sheet popIn" style="width:640px;display:flex;flex-direction:column;gap:12px;background:#FFE066">
      <h2 class="lil" style="margin:0;font-size:34px">🎯 TA QUESTION PIÈGE</h2>
      <p style="margin:0;font-weight:800">L'inspecteur la posera au Duo ${S.turn} en bonus, à la fin de l'interrogatoire. Vise un détail qu'ils n'ont sûrement pas calé !</p>
      <input id="trapInput" class="input" maxlength="120" autocomplete="off" placeholder="Ex : De quelle couleur étaient les chaussettes de ${esc(namesFor(S.turn).A)} ?" value="${esc(trapDraft)}">
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn small cream" data-act="close">ANNULER</button><button type="submit" class="btn small red" style="font-size:18px">ENVOYER À L'INSPECTEUR</button></div>
    </form></div>`;
  }
  if(modal === "worst"){
    const rows = [];
    for(let r=0;r<3;r++) for(const duo of ["A","B"]) for(let q=0;q<L.nq(S,r,duo);q++){
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
  if(S.phase === "dossier"){
    const elapsed = L.CFG.PREP_MS/1000 - ms/1000;
    document.querySelectorAll(".para").forEach(el => {
      const on = elapsed >= +el.dataset.at;
      if(on && !el.classList.contains("on")){ el.classList.add("on"); if(+el.dataset.at > 0 && !force) AU.sfx("clack"); }
    });
  }
  document.querySelectorAll("[data-timer]").forEach(el => { el.textContent = localDeadline ? fmtTime(ms) : ""; });
  const fu = $("#fuse");
  if(fu){ const tot = S.phase === "interro" ? L.CFG.ANSWER_MS : 1; fu.style.width = (100 * Math.min(1, ms / tot)) + "%"; }
  const t = $("#tnum"), meAct = S.phase === "interro" && me() && me().duo === S.turn && !S.signed[myId];
  screen.classList.toggle("danger", !!(meAct && s <= 5 && s > 0));
  if(t){ t.classList.toggle("urgent", s <= 5 && s > 0); if(s !== lastSec && s <= 5 && s > 0 && meAct) AU.sfx("urgent"); }
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
    case "repeat": AU.speak(questionText(S.round, S.q, S.turn), {onstart:()=>setTalking(true), onend:()=>setTalking(false)}); break;
    case "override": act({type:"override", idx:S.ridx}); break;
    case "rematch": act({type:"rematch"}); break;
    case "worst": modal = "worst"; render(); break;
    case "close": modal = null; render(); break;
    case "trapOpen": modal = "trap"; if(S.phase==="interro"){ screen.insertAdjacentHTML("beforeend", modalHtml()); } else render(); setTimeout(()=>{ const i=$("#trapInput"); if(i) i.focus(); }, 60); break;
    case "bet": act({type:"bet", v: d.v==="1"}); break;
    case "react": act({type:"react", kind:d.k}); break;
    case "home": tab.del("pd_room"); tab.del("pd_host"); location.href = location.pathname + (LOCAL ? "?local=1" : ""); break;
  }
});
stage.addEventListener("submit", e => {
  e.preventDefault();
  if(e.target.id === "trapForm"){
    const v = ($("#trapInput").value || "").trim();
    if(v.length < 4){ toast("Écris une vraie question !"); return; }
    act({type:"trap", text:v}); trapDraft = ""; modal = null; const m = $(".modal"); if(m) m.remove(); toast("Question piège envoyée à l'inspecteur 🎯"); return;
  }
  submit();
});
let draftT = null;
stage.addEventListener("input", e => {
  if(e.target.id === "trapInput") trapDraft = e.target.value;
  if(e.target.id === "answer"){
    myAnswers[S.round+"-"+S.q] = e.target.value;
    clearTimeout(draftT); const v = e.target.value;
    draftT = setTimeout(() => act({type:"draft", text:v}), 250);
  }
});
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
(function boot(){
  let saved = null; try{ saved = JSON.parse(tab.get("pd_host", "null")); }catch(e){}
  if(saved && urlCode && saved.code === urlCode && saved.hostId === myId) return openHost(urlCode, saved, 0);
  if(urlCode && tab.get("pd_room", "") === urlCode && myName) return joinRoom(urlCode);
})();
if(LOCAL) window.__pd = { get S(){ return S; }, act, myId };
})();
