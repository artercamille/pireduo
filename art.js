// Personnages et illustrations en SVG (style cartoon, contours épais)
(function(){
const INK = "#15131F";
let uidN = 0;
const uid = p => p + (++uidN);

const AVATARS = [
  {id:0, nom:"Surfeur",  style:"surf",   skin:"#F7CDA8", shade:"#E8AE85", nose:"#C9875E", hair:"#E8913F", hairD:"#C9702A", hairL:"#FFC98A", eye:"#6E8FA8", shirt:"#2F5DA8"},
  {id:1, nom:"Bouclé",   style:"afro",   skin:"#B5744C", shade:"#93593A", nose:"#7A4528", hair:"#2B1D16", hairD:"#1C120C", hairL:"#5A4232", eye:"#3B2416", shirt:"#6FD6B8"},
  {id:2, nom:"Chignon",  style:"bun",    skin:"#F2C29B", shade:"#D69A6E", nose:"#B87A50", hair:"#1C1A26", hairD:"#0E0D14", hairL:"#4A4660", eye:"#3B2416", shirt:"#B48CF2"},
  {id:3, nom:"Bonnet",   style:"beanie", skin:"#E0A47A", shade:"#C2845A", nose:"#A86A40", hair:"#FF5A5F", hairD:"#C4232D", hairL:"#FFF8EA", eye:"#4A6B3A", shirt:"#FFC23D"},
  {id:4, nom:"Brosse",   style:"short",  skin:"#F5C9A0", shade:"#D99A6E", nose:"#B98058", hair:"#6B4A2E", hairD:"#4A3220", hairL:"#9C7550", eye:"#5A7FA8", shirt:"#FF5A5F"},
  {id:5, nom:"Blonde",   style:"long",   skin:"#F7CDA8", shade:"#E8AE85", nose:"#C9875E", hair:"#F2D06B", hairD:"#C9A43C", hairL:"#FFF0B0", eye:"#4F8F6A", shirt:"#2EA35A"},
  {id:6, nom:"Barbu",    style:"shaved", beard:"full", skin:"#8D5A3B", shade:"#6E432A", nose:"#4F2E1C", hair:"#2B1D16", hairD:"#1C120C", hairL:"#4A3428", eye:"#2B1D16", shirt:"#16213A"},
  {id:7, nom:"Mèche",    style:"side",   skin:"#FAD7BD", shade:"#E6B392", nose:"#C98E66", hair:"#B8322A", hairD:"#8A1F18", hairL:"#E86A5A", eye:"#6E8FA8", shirt:"#E9DFCB"},
  {id:8,  nom:"Mâchoire",   style:"short",    face:"square", skin:"#F7CDA8", shade:"#E3A780", nose:"#C9875E", hair:"#F2D06B", hairD:"#C9A43C", hairL:"#FFF0B0", eye:"#5A8FC8", shirt:"#FF9F45"},
  {id:9,  nom:"Boucles",    style:"curly",    beard:"short", skin:"#D9A777", shade:"#B9865A", nose:"#9A6640", hair:"#1C1A26", hairD:"#0E0D14", hairL:"#4A4660", eye:"#3B2416", shirt:"#C4232D"},
  {id:10, nom:"Frange",     style:"straight", eyeShape:"almond", skin:"#F2D2A9", shade:"#D9AE80", nose:"#B88A5E", hair:"#B08A60", hairD:"#7E5F3E", hairL:"#D9BC92", eye:"#2B1D16", shirt:"#2EA35A"},
  {id:11, nom:"Grand roux", style:"side",     freckles:true, skin:"#FBE0CB", shade:"#EBB898", nose:"#D0906A", hair:"#D9662A", hairD:"#A8451A", hairL:"#F59A5C", eye:"#3E7FC8", shirt:"#16213A"},
  {id:12, nom:"Chauve",     style:"bald",     face:"round", beard:"full", skin:"#F0B98F", shade:"#D9976C", nose:"#B87450", hair:"#6B4A2E", hairD:"#4A3220", hairL:"#9C7550", eye:"#5A7FA8", shirt:"#B48CF2"}
];

const FACES = {
  base:   "M-44 -14 Q-46 -62 0 -64 Q46 -62 44 -14 Q44 28 0 42 Q-44 28 -44 -14 Z",
  square: "M-45 -14 Q-47 -62 0 -64 Q47 -62 45 -14 L44 18 Q42 38 22 42 L-22 42 Q-42 38 -44 18 Z",
  round:  "M-50 -10 Q-52 -62 0 -64 Q52 -62 50 -10 Q52 36 0 46 Q-52 36 -50 -10 Z"
};
const FACE = FACES.base;

function hairBack(a){
  const s = `stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"`;
  switch(a.style){
    case "surf": return `<path d="M-58 -18 Q-68 -82 0 -90 Q68 -82 60 -18 L64 40 Q52 54 40 44 L42 2 L-42 2 L-40 44 Q-52 54 -64 40 Z" fill="${a.hairD}" ${s}/>`;
    case "afro": return `<g fill="${a.hair}" stroke="${INK}" stroke-width="4"><circle cx="-44" cy="-50" r="22"/><circle cx="-20" cy="-74" r="24"/><circle cx="12" cy="-78" r="24"/><circle cx="40" cy="-58" r="22"/><circle cx="-56" cy="-22" r="16"/><circle cx="56" cy="-26" r="16"/><circle cx="-2" cy="-58" r="22"/></g>`;
    case "bun": return `<circle cx="0" cy="-78" r="19" fill="${a.hair}" ${s}/><path d="M-10 -86 Q0 -92 10 -86" stroke="${a.hairL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    case "long": return `<path d="M-56 -20 Q-66 -84 0 -90 Q66 -84 58 -20 L66 58 Q42 70 32 44 L40 0 L-40 0 L-32 44 Q-42 70 -66 58 Z" fill="${a.hairD}" ${s}/>`;
    case "side": return `<path d="M-50 -10 Q-56 -72 0 -74 Q56 -72 50 -10 Z" fill="${a.hairD}" ${s}/>`;
    case "straight": return `<path d="M-50 -2 Q-58 -78 0 -80 Q58 -78 50 -2 Z" fill="${a.hairD}" ${s}/>`;
    default: return "";
  }
}

function hairFront(a){
  const s = `stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"`;
  switch(a.style){
    case "surf": return `
      <path d="M-50 -16 Q-58 -66 -12 -78 Q36 -86 56 -52 Q62 -32 52 -10 Q46 -30 34 -36 Q32 -22 20 -16 Q18 -36 4 -42 Q0 -24 -14 -18 Q-16 -36 -28 -38 Q-34 -22 -44 -14 Q-46 -24 -50 -16 Z" fill="${a.hair}" ${s}/>
      <path d="M-52 -20 Q-60 10 -54 34 Q-46 24 -44 -8 Z" fill="${a.hair}" ${s}/>
      <path d="M52 -20 Q60 10 54 34 Q46 24 44 -8 Z" fill="${a.hairD}" ${s}/>
      <path d="M-32 -68 Q-22 -52 -28 -40 M-2 -76 Q4 -60 2 -44 M28 -70 Q36 -56 32 -38" stroke="${a.hairD}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-26 -72 Q-2 -82 22 -74" stroke="${a.hairL}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "afro": return `
      <g fill="${a.hair}" stroke="${INK}" stroke-width="3.5"><circle cx="-30" cy="-50" r="13"/><circle cx="-8" cy="-56" r="14"/><circle cx="16" cy="-54" r="13"/><circle cx="34" cy="-44" r="11"/></g>
      <path d="M-26 -62 Q-18 -68 -10 -64 M10 -66 Q18 -70 26 -64 M-50 -60 Q-44 -66 -36 -64" stroke="${a.hairL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    case "bun": return `
      <path d="M-47 -6 Q-52 -72 0 -72 Q52 -72 47 -6 Q40 -34 4 -42 L0 -54 L-4 -42 Q-40 -34 -47 -6 Z" fill="${a.hair}" ${s}/>
      <path d="M-22 -62 Q-10 -68 -4 -60" stroke="${a.hairL}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "beanie": return `
      <path d="M-50 -24 Q-52 -88 0 -90 Q52 -88 50 -24 Z" fill="${a.hair}" ${s}/>
      <path d="M-24 -84 L-26 -30 M0 -90 L0 -30 M24 -84 L26 -30" stroke="${a.hairD}" stroke-width="3" fill="none"/>
      <path d="M-54 -36 Q0 -44 54 -36 L54 -18 Q0 -26 -54 -18 Z" fill="${a.hairD}" ${s}/>
      <circle cx="0" cy="-94" r="13" fill="${a.hairL}" stroke="${INK}" stroke-width="4"/>
      <path d="M-34 -70 Q-28 -80 -16 -82" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>`;
    case "short": return `
      <path d="M-46 -16 Q-50 -72 0 -74 Q50 -72 46 -16 Q44 -34 34 -40 L30 -30 L22 -42 L14 -32 L6 -44 L-2 -32 L-10 -44 L-18 -32 L-26 -42 L-32 -30 L-36 -40 Q-44 -34 -46 -16 Z" fill="${a.hair}" ${s}/>
      <path d="M-24 -64 Q0 -72 24 -64" stroke="${a.hairL}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case "long": return `
      <path d="M-50 -8 Q-58 -70 -2 -76 Q-8 -52 -28 -38 Q-40 -28 -44 4 Z" fill="${a.hair}" ${s}/>
      <path d="M50 -8 Q58 -70 -2 -76 Q18 -52 34 -42 Q44 -28 46 4 Z" fill="${a.hair}" ${s}/>
      <path d="M-50 -14 Q-62 22 -58 60 Q-46 54 -42 2 Z" fill="${a.hair}" ${s}/>
      <path d="M50 -14 Q62 22 58 60 Q46 54 42 2 Z" fill="${a.hairD}" ${s}/>
      <path d="M-36 -64 Q-22 -72 -10 -70" stroke="${a.hairL}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "shaved": return `
      <path d="M-44 -16 Q-46 -66 0 -68 Q46 -66 44 -16 Q40 -42 0 -48 Q-40 -42 -44 -16 Z" fill="${a.hair}" opacity=".7" ${s}/>`;
    case "curly": {
      const pts = [[-38,-40],[-28,-54],[-14,-62],[2,-64],[18,-60],[31,-52],[40,-38],[-44,-24],[44,-24],[-20,-48],[-4,-52],[12,-50],[26,-42]];
      return `<g fill="${a.hair}" stroke="${INK}" stroke-width="3.5">${pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i>8?8:10}"/>`).join("")}</g>
      <path d="M-30 -58 Q-24 -62 -18 -60 M6 -68 Q12 -70 18 -66" stroke="${a.hairL}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    case "straight": return `
      <path d="M-49 -4 Q-56 -76 0 -78 Q56 -76 49 -4 L44 -4 L42 -24 L-42 -24 L-44 -4 Z" fill="${a.hair}" ${s}/>
      <path d="M-30 -24 L-28 -34 M-12 -24 L-11 -36 M8 -24 L9 -36 M26 -24 L28 -34" stroke="${a.hairD}" stroke-width="3" stroke-linecap="round"/>
      <path d="M-30 -66 Q-6 -74 22 -68" stroke="${a.hairL}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case "bald": return `
      <ellipse cx="-16" cy="-48" rx="15" ry="7" fill="#FFF" opacity=".5" transform="rotate(-24 -16 -48)"/>
      <path d="M-49 -6 Q-50 -20 -46 -26 M49 -6 Q50 -20 46 -26" stroke="${a.hair}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>`;
    case "side": return `
      <path d="M-48 -12 Q-58 -76 0 -80 Q56 -78 52 -18 Q44 -42 18 -40 Q-14 -34 -36 -50 Q-38 -30 -48 -12 Z" fill="${a.hair}" ${s}/>
      <path d="M-34 -50 Q0 -70 44 -50" stroke="${a.hairD}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-20 -72 Q4 -80 28 -70" stroke="${a.hairL}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  return "";
}

function almondEyes(a, expr){
  const e = a.eye, open = expr==="shocked" ? 1.5 : 1;
  const d = {neutral:[0,0], smirk:[1,0], sad:[0,1], shocked:[0,0], confused:[-3,-2]}[expr] || [0,0];
  const eye = (cx, side) => {
    const cy = -5, o = side, id = uid("ey");
    const path = `M${cx-11*o} ${cy-1.5} Q${cx-1*o} ${cy-9*open} ${cx+10*o} ${cy+1} Q${cx} ${cy+7*open} ${cx-11*o} ${cy-1.5} Z`;
    return `<clipPath id="${id}"><path d="${path}"/></clipPath>
      <path d="${path}" fill="#FFFFFF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <g clip-path="url(#${id})"><circle cx="${cx+d[0]}" cy="${cy+d[1]}" r="${expr==="shocked"?3.5:5.5}" fill="${expr==="shocked"?INK:e}"/>${expr==="shocked"?"":`<circle cx="${cx+d[0]}" cy="${cy+d[1]}" r="2.6" fill="${INK}"/><circle cx="${cx+d[0]+1.5}" cy="${cy+d[1]-2}" r="1.6" fill="#FFF"/>`}</g>
      <path d="M${cx-12*o} ${cy-2} Q${cx-1*o} ${cy-10*open} ${cx+10*o} ${cy+0.5}" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  };
  let out = eye(-18, 1) + eye(18, -1);
  if(expr==="sad") out += `<path d="M-26 4 Q-18 9 -10 4 M10 4 Q18 9 26 4" stroke="#7FC8FF" stroke-width="3" fill="none"/>`;
  return out;
}
function eyes(a, expr){
  if(a.eyeShape==="almond" && expr!=="happy") return almondEyes(a, expr);
  const e = a.eye, w = `fill="#FFFFFF" stroke="${INK}" stroke-width="3.5"`;
  const pair = (dx, dy) => `
    <ellipse cx="-18" cy="-6" rx="9" ry="9" ${w}/><ellipse cx="18" cy="-6" rx="9" ry="9" ${w}/>
    <circle cx="${-17+dx}" cy="${-3+dy}" r="5.5" fill="${e}"/><circle cx="${17+dx}" cy="${-3+dy}" r="5.5" fill="${e}"/>
    <circle cx="${-17+dx}" cy="${-3+dy}" r="2.6" fill="${INK}"/><circle cx="${17+dx}" cy="${-3+dy}" r="2.6" fill="${INK}"/>
    <circle cx="${-15+dx}" cy="${-6+dy}" r="2" fill="#FFF"/><circle cx="${19+dx}" cy="${-6+dy}" r="2" fill="#FFF"/>`;
  switch(expr){
    case "smirk": return pair(1,0) + `<path d="M-28 -8 Q-18 -15 -8 -8 L-8 -14 L-28 -14 Z" fill="${a.skin}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case "sad": return pair(0,1) + `
      <path d="M-28 -9 Q-18 -16 -8 -9 L-8 -15 L-28 -15 Z" fill="${a.skin}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M28 -9 Q18 -16 8 -9 L8 -15 L28 -15 Z" fill="${a.shade}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-26 2 Q-18 8 -10 2 M10 2 Q18 8 26 2" stroke="#7FC8FF" stroke-width="3" fill="none"/>`;
    case "shocked": return `
      <ellipse cx="-18" cy="-8" rx="12" ry="13" ${w}/><ellipse cx="18" cy="-8" rx="12" ry="13" ${w}/>
      <circle cx="-17" cy="-6" r="3.5" fill="${INK}"/><circle cx="17" cy="-6" r="3.5" fill="${INK}"/>
      <circle cx="-16" cy="-8" r="1.2" fill="#FFF"/><circle cx="18" cy="-8" r="1.2" fill="#FFF"/>`;
    case "confused": return `
      <ellipse cx="-18" cy="-6" rx="10" ry="9" ${w}/><ellipse cx="18" cy="-9" rx="11" ry="12" ${w}/>
      <circle cx="-22" cy="-9" r="4.5" fill="${e}"/><circle cx="14" cy="-13" r="5" fill="${e}"/>
      <circle cx="-22" cy="-9" r="2.2" fill="${INK}"/><circle cx="14" cy="-13" r="2.4" fill="${INK}"/>
      <circle cx="-21" cy="-11" r="1.4" fill="#FFF"/><circle cx="15" cy="-15" r="1.6" fill="#FFF"/>`;
    case "happy": return `<path d="M-27 -4 Q-18 -15 -9 -4 M9 -4 Q18 -15 27 -4" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    default: return pair(0,0);
  }
}

function brows(a, expr){
  const c = a.style==="beanie" ? "#6B4A2E" : (a.style==="long" ? "#A8822A" : a.hairD);
  const B = {
    neutral:["M-30 -24 Q-20 -28 -8 -25","M8 -25 Q20 -28 30 -24"],
    smirk:["M-32 -24 Q-20 -30 -8 -26","M8 -32 Q20 -38 32 -30"],
    sad:["M-32 -20 Q-20 -22 -8 -30","M32 -20 Q20 -22 8 -30"],
    shocked:["M-34 -34 Q-22 -44 -8 -36","M8 -36 Q22 -44 34 -34"],
    confused:["M-34 -24 Q-22 -24 -8 -20","M8 -34 Q20 -42 34 -34"],
    happy:["M-30 -28 Q-20 -34 -8 -28","M8 -28 Q20 -34 30 -28"]
  }[expr] || ["M-30 -24 Q-20 -28 -8 -25","M8 -25 Q20 -28 30 -24"];
  return `<path d="${B[0]}" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="${B[1]}" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
}

function mouth(a, expr){
  switch(expr){
    case "smirk": return `<path d="M-12 24 Q4 32 18 18" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M17 15 L21 21" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    case "sad": return `<path d="M-15 30 Q-8 22 0 25 Q8 22 15 30 Q8 27 0 29 Q-8 27 -15 30 Z" fill="#6B2A2A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case "shocked": return `<ellipse cx="0" cy="29" rx="10" ry="12" fill="#5A1E22" stroke="${INK}" stroke-width="4"/><ellipse cx="0" cy="34" rx="6" ry="4" fill="#E86A75"/>`;
    case "confused": return `<path d="M-14 28 Q-6 22 2 28 Q10 34 16 26" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case "happy": return `<path d="M-17 18 Q0 40 17 18 Z" fill="#6B2A2A" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-8 30 Q0 25 8 30 Q0 35 -8 30 Z" fill="#E86A75"/>`;
    default: return `<path d="M-10 23 Q0 29 10 23" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  }
}

// Tête + cou (+ épaules si bust). Coordonnées locales : centre du visage en 0,0.
function head(av, expr="neutral", opt={}){
  const a = AVATARS[av] || AVATARS[0];
  const cid = uid("fc");
  const neckEnd = opt.body ? 80 : 48;
  let s = "";
  s += hairBack(a);
  if(!opt.body){
    s += `<path d="M-82 62 Q-78 46 -22 40 L22 40 Q78 46 82 62 Z" fill="${a.shirt}" stroke="${INK}" stroke-width="4.5"/>`;
    s += `<path d="M-30 42 Q0 56 30 42" stroke="${INK}" stroke-width="3" fill="none" opacity=".5"/>`;
  }
  s += `<path d="M-17 30 L-17 ${neckEnd} Q0 ${neckEnd+8} 17 ${neckEnd} L17 30 Z" fill="${a.skin}" stroke="${INK}" stroke-width="4"/>`;
  s += `<path d="M-17 34 Q0 50 17 34 L17 46 Q0 58 -17 46 Z" fill="${a.shade}"/>`;
  s += `<ellipse cx="-45" cy="-4" rx="9" ry="13" fill="${a.skin}" stroke="${INK}" stroke-width="4"/>`;
  s += `<ellipse cx="45" cy="-4" rx="9" ry="13" fill="${a.shade}" stroke="${INK}" stroke-width="4"/>`;
  s += `<path d="M-46 -8 Q-41 -4 -45 2" stroke="${a.nose}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const F = FACES[a.face] || FACES.base;
  s += `<clipPath id="${cid}"><path d="${F}"/></clipPath>`;
  s += `<path d="${F}" fill="${a.skin}" stroke="${INK}" stroke-width="4.5"/>`;
  s += `<path d="M14 -70 Q52 -44 44 -8 Q42 28 0 44 L0 70 L70 70 L70 -80 Z" fill="${a.shade}" opacity=".85" clip-path="url(#${cid})"/>`;
  s += `<ellipse cx="-22" cy="-30" rx="9" ry="5" fill="#FFF" opacity=".35"/>`;
  if(a.beard==="full") s += a.face==="round"
    ? `<path d="M-48 0 Q-48 52 0 56 Q48 52 48 0 Q36 30 0 32 Q-36 30 -48 0 Z" fill="${a.hair}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-30 22 Q-20 42 0 46 Q20 42 30 22" stroke="${a.hairL}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="M-42 2 Q-42 44 0 48 Q42 44 42 2 Q32 28 0 30 Q-32 28 -42 2 Z" fill="${a.hair}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  else if(a.beard==="short") s += `<path d="M-43 4 Q-42 40 0 45 Q42 40 43 4 Q38 34 0 37 Q-38 34 -43 4 Z" fill="${a.hair}" opacity=".9" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-6 34 Q0 44 6 34 Z" fill="${a.hair}"/>`;
  else s += `<ellipse cx="-26" cy="15" rx="9" ry="5" fill="#FF8C8C" opacity=".5"/><ellipse cx="26" cy="15" rx="9" ry="5" fill="#FF8C8C" opacity=".4"/>`;
  if(a.freckles) s += `<g fill="#C9703E" opacity=".75">${[[-30,8],[-24,12],[-34,14],[-26,4],[30,8],[24,12],[34,14],[26,4],[-6,8],[6,9]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8"/>`).join("")}</g>`;
  s += brows(a, expr) + eyes(a, expr);
  s += `<path d="M-1 4 Q-7 14 -1 17 Q4 18 6 15" stroke="${a.nose}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if(a.beard) s += `<path d="M-22 18 Q0 10 22 18 Q12 24 0 21 Q-12 24 -22 18 Z" fill="${a.hair}" stroke="${INK}" stroke-width="3.5"/>`;
  s += mouth(a, expr);
  s += hairFront(a);
  if(expr==="sad") s += `<path class="drop" d="M-24 8 Q-28 18 -24 24 Q-19 18 -24 8 Z" fill="#9FD8FF" stroke="${INK}" stroke-width="2.5"/><path class="drop" style="animation-delay:.9s" d="M24 8 Q20 18 24 24 Q29 18 24 8 Z" fill="#9FD8FF" stroke="${INK}" stroke-width="2.5"/>`;
  if(expr==="shocked") s += `<path class="sweat" d="M50 -40 Q56 -28 50 -22 Q44 -28 50 -40 Z" fill="#9FD8FF" stroke="${INK}" stroke-width="2.5"/>`;
  if(expr==="confused") s += `<text x="56" y="-62" text-anchor="middle" font-family="Lilita One" font-size="30" fill="#FFC23D" stroke="${INK}" stroke-width="3" paint-order="stroke">?</text>`;
  return s;
}

// Portrait en buste (svg complet)
function portrait(av, expr, w=148, h=146){
  return `<svg aria-hidden="true" width="${w}" height="${h}" viewBox="-74 -100 148 160">${head(av, expr)}</svg>`;
}

// Détenu en combinaison orange avec pancarte
function detainee(av, expr, label){
  const a = AVATARS[av] || AVATARS[0];
  const gid = uid("suit");
  return `
  <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF9F45"/><stop offset=".6" stop-color="#F28C28"/><stop offset="1" stop-color="#D46A12"/></linearGradient></defs>
  <ellipse cx="0" cy="262" rx="100" ry="12" fill="#000" opacity=".3"/>
  <path d="M-96 252 L-100 150 Q-100 96 -44 78 Q-20 74 0 90 Q20 74 44 78 Q100 96 100 150 L96 252 Z" fill="url(#${gid})" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M-60 120 Q-66 180 -60 250" stroke="#D46A12" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M58 130 Q64 190 58 250" stroke="#B35A0E" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M-80 120 Q-84 110 -70 98" stroke="#FFC48A" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M-16 74 L0 100 L16 74 Z" fill="#FFF8EA" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M-44 78 L-18 72 L0 100 L-26 116 Z" fill="#FF9F45" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M44 78 L18 72 L0 100 L26 116 Z" fill="#E87D1E" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <g class="${expr==='shocked'?'shake':''}">
    <rect x="-84" y="148" width="168" height="88" rx="8" fill="#20283C" stroke="${INK}" stroke-width="5"/>
    <rect x="-76" y="156" width="152" height="72" rx="4" fill="none" stroke="#3A4560" stroke-width="2.5"/>
    <text x="0" y="176" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="11" letter-spacing="2" fill="#C9D2E3">COMMISSARIAT CENTRAL</text>
    <text x="0" y="212" text-anchor="middle" font-family="Lilita One" font-size="34" fill="#FFC23D">${label}</text>
    <text x="0" y="226" text-anchor="middle" font-family="Special Elite" font-size="11" fill="#8592AA">${new Date().toLocaleDateString('fr-FR')}</text>
    <path d="M-102 178 Q-110 196 -100 210 Q-88 220 -76 212 L-72 186 Q-82 172 -102 178 Z" fill="${a.skin}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-76 186 Q-66 186 -66 192 Q-66 198 -76 198 M-76 198 Q-66 198 -66 204 Q-66 210 -76 210" fill="${a.skin}" stroke="${INK}" stroke-width="3.5"/>
    <path d="M102 178 Q110 196 100 210 Q88 220 76 212 L72 186 Q82 172 102 178 Z" fill="${a.shade}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M76 186 Q66 186 66 192 Q66 198 76 198 M76 198 Q66 198 66 204 Q66 210 76 210" fill="${a.shade}" stroke="${INK}" stroke-width="3.5"/>
  </g>
  ${head(av, expr, {body:true})}`;
}

// L'inspecteur Moustache (buste). Coordonnées : visage autour de (150,130)
function inspector(){
  const cid = uid("insp");
  return `
  <path d="M-10 470 Q-20 300 60 260 L150 236 L240 260 Q330 300 320 470 Z" fill="#D9B87A" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M150 236 L90 470 L70 470 L60 290 Z" fill="#C49E5C" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150 236 L210 470 L230 470 L240 290 Z" fill="#C49E5C" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M118 244 L150 300 L182 244 Z" fill="#FFF8EA" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M142 262 L158 262 L166 360 L150 380 L134 360 Z" fill="#FF5A5F" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M144 290 L156 290 M144 316 L156 316" stroke="#FFC23D" stroke-width="4"/>
  <rect x="128" y="200" width="44" height="40" fill="#F5C9A0" stroke="${INK}" stroke-width="5"/>
  <ellipse cx="72" cy="140" rx="14" ry="20" fill="#F5C9A0" stroke="${INK}" stroke-width="5"/>
  <ellipse cx="228" cy="140" rx="14" ry="20" fill="#E8B48A" stroke="${INK}" stroke-width="5"/>
  <path d="M78 120 Q76 50 150 46 Q224 50 222 120 Q226 200 150 214 Q74 200 78 120 Z" fill="#F5C9A0" stroke="${INK}" stroke-width="6"/>
  <clipPath id="${cid}"><path d="M80 120 Q78 52 150 48 Q222 52 220 120 Q224 198 150 212 Q76 198 80 120 Z"/></clipPath>
  <ellipse cx="238" cy="140" rx="40" ry="100" fill="#D99A6E" opacity=".75" clip-path="url(#${cid})"/>
  <ellipse cx="150" cy="84" rx="70" ry="22" fill="#B98058" opacity=".45" clip-path="url(#${cid})"/>
  <ellipse cx="104" cy="96" rx="10" ry="6" fill="#FFF" opacity=".4"/>
  <ellipse cx="102" cy="160" rx="12" ry="7" fill="#FF8C8C" opacity=".4"/>
  <ellipse cx="150" cy="150" rx="18" ry="14" fill="#E8A57E" stroke="${INK}" stroke-width="4"/>
  <path d="M96 104 Q112 90 132 100" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M168 92 Q190 76 208 88" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <ellipse cx="116" cy="124" rx="9" ry="7" fill="${INK}"/><circle cx="119" cy="121" r="2.5" fill="#FFF"/>
  <g class="blink"><circle cx="186" cy="120" r="13" fill="#FFF" stroke="${INK}" stroke-width="4"/><circle cx="188" cy="122" r="6" fill="${INK}"/><circle cx="190" cy="119" r="2" fill="#FFF"/></g>
  <path class="wiggle" d="M98 172 Q120 150 150 166 Q180 150 202 172 Q214 186 222 176 Q214 198 188 190 Q168 184 150 178 Q132 184 112 190 Q86 198 78 176 Q86 186 98 172 Z" fill="#5A3418" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M134 196 Q150 202 166 196" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M40 70 Q40 52 70 50 L230 50 Q260 52 260 70 L262 78 L38 78 Z" fill="#6B4A2E" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M78 52 Q78 -6 150 -8 Q222 -6 222 52 Z" fill="#7E5838" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M118 2 Q150 18 182 2" fill="none" stroke="${INK}" stroke-width="4"/>
  <rect x="80" y="30" width="140" height="18" fill="#2B1D16" stroke="${INK}" stroke-width="4"/>
  <path d="M100 10 Q120 0 136 6" stroke="#9C7550" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

function inspectorHead(w=120,h=124){
  return `<svg aria-hidden="true" width="${w}" height="${h}" viewBox="40 -12 220 228"><path d="M60 216 Q70 200 150 196 Q230 200 240 216 Z" fill="#D9B87A" stroke="${INK}" stroke-width="6"/>${inspector().replace(/<path d="M-10 470[\s\S]*?<rect x="128"/, '<rect x="128"')}</svg>`;
}

window.ART = { AVATARS, head, portrait, detainee, inspector, inspectorHead, INK };
})();
