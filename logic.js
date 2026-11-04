// Logique pure du jeu (exécutée par l'hôte). Testable sous Node.
(function(root){
const CFG = { PREP_MS: 90000, ANSWER_MS: 30000, REVEAL_MS: 7000, ROUNDEND_MS: 12000, ROUNDS: 3, QUESTIONS: 10 };

const STOP = new Set(("le la les l un une des du de d au aux a en et ou on il elle ils elles je j tu t nous vous c s est etait ce cet cette ces son sa ses mon ma mes ton ta tes leur leurs avec pour par sur dans y euros euro eur e balles balle environ genre bah ben euh").split(" "));
const NUM = {zero:"0",deux:"2",trois:"3",quatre:"4",cinq:"5",six:"6",sept:"7",huit:"8",neuf:"9",dix:"10",onze:"11",douze:"12",treize:"13",quatorze:"14",quinze:"15",seize:"16",vingt:"20",trente:"30",quarante:"40",cinquante:"50",cent:"100"};

function norm(s){
  if(!s) return "";
  s = String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  s = s.replace(/(\d+)\s*h\s*(00)?\b/g, "$1h").replace(/(\d+)\s*(€|e\b)/g,"$1 ");
  s = s.replace(/['’`]/g," ").replace(/[^a-z0-9 ]/g," ");
  return s.split(/\s+/).filter(t => t && !STOP.has(t)).map(t => NUM[t] || t).map(t => (t.length>3 && /[sx]$/.test(t)) ? t.slice(0,-1) : t).join(" ");
}
function lev(a,b){
  const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; }
  return p[n];
}
function isMatch(a,b){
  const na=norm(a), nb=norm(b);
  if(!na || !nb) return false;
  if(na===nb) return true;
  const ta=new Set(na.split(" ")), tb=new Set(nb.split(" "));
  const inter=[...ta].filter(x=>tb.has(x)).length, uni=new Set([...ta,...tb]).size;
  if(inter/uni >= 0.67) return true;
  const ca=na.replace(/ /g,""), cb=nb.replace(/ /g,"");
  if(Math.min(ca.length,cb.length)>=4 && (ca.includes(cb)||cb.includes(ca))) return true;
  const L=Math.max(ca.length,cb.length);
  if(L>=4 && 1-lev(ca,cb)/L >= 0.8) return true;
  return false;
}

function createState(code, hostId){
  return { v:1, code, hostId, phase:"lobby", players:{}, order:[], round:0, scen:[], usedScen:[], q:0,
           answers:{}, signed:{}, overrides:{}, ridx:0, deadline:null, botAt:{}, gage:"", loser:null, ev:0 };
}
function members(S, duo){ return S.order.map(id=>S.players[id]).filter(p=>p && p.duo===duo).sort((a,b)=>a.slot-b.slot); }
function seated(S){ return S.order.map(id=>S.players[id]).filter(p=>p && p.duo); }
function duoNames(S, duo){ const m=members(S,duo); return {A:(m[0]&&m[0].name)||"?", B:(m[1]&&m[1].name)||"?"}; }
function fmt(text, names){ return String(text).replace(/\{A\}/g, names.A).replace(/\{B\}/g, names.B); }
function scenOf(S, r){ return (root.SCENARIOS||[]).find(x=>x.id===S.scen[r]); }
function stepInfo(idx){ return { q: Math.floor(idx/2), duo: idx%2===0 ? "A":"B" }; }
function matchOf(S, r, q, duo){
  const k = r+"-"+q+"-"+duo;
  if(k in S.overrides) return S.overrides[k];
  const m = members(S,duo), ans = S.answers[r+"-"+q] || {};
  if(m.length<2) return false;
  return isMatch(ans[m[0].id], ans[m[1].id]);
}
function scores(S){
  const sc = {A:0,B:0}, per = [];
  for(let r=0; r<=S.round && r<CFG.ROUNDS; r++){
    const rs = {A:0,B:0};
    let upto = 2*CFG.QUESTIONS;
    if(r===S.round){
      if(S.phase==="reveal") upto = S.ridx+1;
      else if(S.phase!=="roundEnd" && S.phase!=="verdict") upto = 0;
    }
    for(let i=0;i<upto;i++){ const {q,duo}=stepInfo(i); if(matchOf(S,r,q,duo)) rs[duo]++; }
    sc.A+=rs.A; sc.B+=rs.B; per.push(rs);
  }
  return {total:sc, per};
}

const BOT_NAMES = ["Bot Gégé","Bot Josiane","Bot Kévin","Bot Mireille"];
const BOT_POOL = ["Pizza","Bleu","Rouge","Noir","{A}","{B}","22h","Minuit","À pied","En bus","Personne","12 euros","20 euros","Un Coca","De l'eau","Au fond","Devant","Aucune idée","Un chien","Le serveur","3","Vert"];

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pickScenarios(S){
  const all = (root.SCENARIOS||[]).map(s=>s.id);
  let pool = all.filter(id=>!S.usedScen.includes(id));
  if(pool.length < CFG.ROUNDS){ S.usedScen = []; pool = all.slice(); }
  S.scen = shuffle(pool).slice(0, CFG.ROUNDS);
  S.usedScen.push(...S.scen);
}
function startQuestion(S, now){
  S.signed = {}; S.deadline = now + CFG.ANSWER_MS; S.botAt = {};
  seated(S).filter(p=>p.bot).forEach(p => S.botAt[p.id] = now + 2500 + Math.random()*9000);
}
function startDossier(S, now){
  S.phase = "dossier"; S.q = 0; S.deadline = now + CFG.PREP_MS;
  Object.values(S.players).forEach(p => p.ready = !!p.bot);
}
function everyoneSigned(S){ return seated(S).filter(p=>p.online||p.bot).every(p=>S.signed[p.id]); }
function everyoneReady(S){ return seated(S).filter(p=>p.online||p.bot).every(p=>p.ready); }
function nextQuestion(S, now){
  const key = S.round+"-"+S.q; S.answers[key] = S.answers[key] || {};
  if(S.q+1 < CFG.QUESTIONS){ S.q++; startQuestion(S, now); }
  else { S.phase = "reveal"; S.ridx = 0; S.deadline = now + CFG.REVEAL_MS; }
}
function finishGame(S){
  const {total, per} = scores(S);
  S.phase = "verdict"; S.deadline = null;
  if(total.A !== total.B) S.loser = total.A < total.B ? "A" : "B";
  else { const last = per[per.length-1] || {A:0,B:0}; S.loser = last.A===last.B ? "both" : (last.A<last.B ? "A":"B"); }
  const G = root.GAGES || ["Gage surprise"]; S.gage = G[Math.floor(Math.random()*G.length)];
}

function addPlayer(S, id, name, av, bot=false){
  name = String(name||"Suspect").replace(/[<>]/g,"").trim().slice(0,16) || "Suspect";
  av = Math.max(0, Math.min(7, parseInt(av)||0));
  if(S.players[id]){ Object.assign(S.players[id], {name, av, online:true}); return S.players[id]; }
  S.players[id] = {id, name, av, duo:null, slot:0, bot, online:true, ready:false};
  S.order.push(id);
  if(S.phase==="lobby"){ const free = freeSlot(S); if(free) Object.assign(S.players[id], free); }
  S.ev++;
  return S.players[id];
}
function freeSlot(S){
  for(const duo of ["A","B"]) for(const slot of [0,1]) if(!seated(S).some(p=>p.duo===duo&&p.slot===slot)) return {duo,slot};
  return null;
}
function removePlayer(S, id){ delete S.players[id]; S.order = S.order.filter(x=>x!==id); }

// Applique une action. Renvoie true si l'état a changé.
function reduce(S, a, pid, now){
  const p = S.players[pid], isHost = pid===S.hostId;
  switch(a.type){
    case "slot": {
      if(S.phase!=="lobby" || !p) return false;
      if(seated(S).some(x=>x.duo===a.duo && x.slot===a.slot)) return false;
      p.duo = a.duo==="A"||a.duo==="B" ? a.duo : null; p.slot = a.slot?1:0; return true;
    }
    case "leaveSeat": if(S.phase!=="lobby"||!p) return false; p.duo=null; return true;
    case "addBot": {
      if(!isHost || S.phase!=="lobby") return false;
      const free = freeSlot(S); if(!free) return false;
      const used = Object.values(S.players).filter(x=>x.bot).map(x=>x.name);
      const name = BOT_NAMES.find(n=>!used.includes(n)) || "Bot";
      const id = "bot-"+Math.random().toString(36).slice(2,8);
      addPlayer(S, id, name, Math.floor(Math.random()*8), true);
      Object.assign(S.players[id], {duo:a.duo||free.duo, slot: a.duo ? a.slot : free.slot});
      if(a.duo && seated(S).filter(x=>x.duo===a.duo&&x.slot===a.slot).length>1) Object.assign(S.players[id], free);
      return true;
    }
    case "kick": if(!isHost || S.phase!=="lobby" || a.id===S.hostId) return false; removePlayer(S, a.id); return true;
    case "start": {
      if(!isHost || S.phase!=="lobby") return false;
      if(members(S,"A").length<2 || members(S,"B").length<2) return false;
      S.round = 0; S.answers = {}; S.overrides = {}; S.loser = null; S.gage = "";
      pickScenarios(S); startDossier(S, now); return true;
    }
    case "ready": if(S.phase!=="dossier"||!p) return false; p.ready = !p.ready; if(everyoneReady(S)){ S.phase="interro"; S.q=0; startQuestion(S, now); } return true;
    case "answer": {
      if(S.phase!=="interro" || !p || !p.duo || S.signed[pid]) return false;
      const key = S.round+"-"+S.q; S.answers[key] = S.answers[key] || {};
      S.answers[key][pid] = String(a.text||"").replace(/[<>]/g,"").trim().slice(0,80);
      S.signed[pid] = true;
      if(everyoneSigned(S)) nextQuestion(S, now);
      return true;
    }
    case "override": {
      if(S.phase!=="reveal" && S.phase!=="roundEnd") return false;
      const {q,duo} = stepInfo(a.idx);
      if(!(isHost || (p && p.duo && p.duo!==duo))) return false;
      if(S.phase==="reveal" && a.idx>S.ridx) return false;
      const k = S.round+"-"+q+"-"+duo; S.overrides[k] = !matchOf(S,S.round,q,duo); return true;
    }
    case "next": {
      if(!isHost) return false;
      if(S.phase==="reveal") return advanceReveal(S, now);
      if(S.phase==="roundEnd") return nextRound(S, now);
      if(S.phase==="dossier"){ S.phase="interro"; S.q=0; startQuestion(S,now); return true; }
      return false;
    }
    case "rematch": {
      if(!isHost || S.phase!=="verdict") return false;
      S.phase="lobby"; S.round=0; S.answers={}; S.overrides={}; S.deadline=null; S.loser=null; S.ev++; return true;
    }
  }
  return false;
}
function advanceReveal(S, now){
  if(S.ridx+1 < 2*CFG.QUESTIONS){ S.ridx++; S.deadline = now + CFG.REVEAL_MS; return true; }
  if(S.round+1 < CFG.ROUNDS){ S.phase="roundEnd"; S.deadline = now + CFG.ROUNDEND_MS; return true; }
  finishGame(S); return true;
}
function nextRound(S, now){ S.round++; startDossier(S, now); return true; }

// Avance le temps. Renvoie true si l'état a changé.
function tick(S, now){
  let ch = false;
  if(S.phase==="interro"){
    for(const id in S.botAt){
      if(now >= S.botAt[id] && !S.signed[id]){
        const p = S.players[id]; if(!p) continue;
        const names = duoNames(S, p.duo), key = S.round+"-"+S.q, ans = S.answers[key]||{};
        const partner = members(S,p.duo).find(m=>m.id!==id);
        let t = BOT_POOL[Math.floor(Math.random()*BOT_POOL.length)];
        if(partner && ans[partner.id] && Math.random()<0.55) t = ans[partner.id];
        reduce(S, {type:"answer", text: fmt(t, names)}, id, now); ch = true;
        if(S.phase!=="interro") return true;
      }
    }
  }
  if(S.deadline && now >= S.deadline){
    if(S.phase==="dossier"){ S.phase="interro"; S.q=0; startQuestion(S, now); return true; }
    if(S.phase==="interro"){ nextQuestion(S, now); return true; }
    if(S.phase==="reveal") return advanceReveal(S, now);
    if(S.phase==="roundEnd") return nextRound(S, now);
  }
  return ch;
}

const API = { CFG, norm, isMatch, createState, members, seated, duoNames, fmt, scenOf, stepInfo, matchOf, scores, addPlayer, removePlayer, reduce, tick, freeSlot };
if(typeof module!=="undefined" && module.exports) module.exports = API; else root.LOGIC = API;
})(typeof window!=="undefined" ? window : globalThis);
