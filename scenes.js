// Décors (repris des maquettes validées)
(function(){
const INK = "#15131F";

function grain(id){ return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/></filter>`; }
function grainLayer(id){ return `<svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720"><defs>${grain(id)}</defs><rect width="1280" height="720" filter="url(#${id})"/></svg>`; }

function precinct(withBoard=true){
  return `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <pattern id="brick" width="80" height="40" patternUnits="userSpaceOnUse"><rect width="80" height="40" fill="#1A2747"/><path d="M0 0 H80 M0 20 H80 M40 0 V20 M0 20 V40 M80 20 V40" stroke="#121B33" stroke-width="3"/><rect x="3" y="3" width="34" height="14" rx="2" fill="#1E2D52" opacity=".6"/><rect x="43" y="23" width="34" height="14" rx="2" fill="#1E2D52" opacity=".4"/></pattern>
    <radialGradient id="redGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF4D5E" stop-opacity=".75"/><stop offset=".45" stop-color="#FF4D5E" stop-opacity=".22"/><stop offset="1" stop-color="#FF4D5E" stop-opacity="0"/></radialGradient>
    <radialGradient id="blueGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3D8BFF" stop-opacity=".8"/><stop offset=".45" stop-color="#3D8BFF" stop-opacity=".25"/><stop offset="1" stop-color="#3D8BFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05080F" stop-opacity=".75"/></radialGradient>
    <pattern id="cork" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#C88A52"/><circle cx="3" cy="4" r="1.6" fill="#A86C38"/><circle cx="10" cy="9" r="1.2" fill="#B07540"/><circle cx="7" cy="1" r=".9" fill="#DDA36B"/><circle cx="12" cy="2" r=".8" fill="#9C6231"/></pattern>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A6234"/><stop offset="1" stop-color="#6D3F1C"/></linearGradient>
    <linearGradient id="beamR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B78" stop-opacity=".55"/><stop offset="1" stop-color="#FF6B78" stop-opacity="0"/></linearGradient>
    <linearGradient id="beamB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FAEFF" stop-opacity=".55"/><stop offset="1" stop-color="#6FAEFF" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#brick)"/>
  <circle cx="40" cy="20" r="520" fill="url(#redGlow)" class="pA"/>
  <circle cx="1240" cy="20" r="540" fill="url(#blueGlow)" class="pB"/>
  <polygon class="swA" points="53,22 -150,760 256,760" fill="url(#beamR)" style="mix-blend-mode:screen"/>
  <polygon class="swB" points="1227,22 1024,760 1430,760" fill="url(#beamB)" style="mix-blend-mode:screen"/>
  <g transform="translate(18 0)"><rect width="70" height="30" rx="6" fill="#2A2A35" stroke="${INK}" stroke-width="4"/><path class="pA" d="M8 30 Q35 -16 62 30 Z" fill="#FF4D5E" stroke="${INK}" stroke-width="4"/><path d="M20 22 Q30 6 40 10" stroke="#FFD0D4" stroke-width="4" fill="none" stroke-linecap="round"/></g>
  <g transform="translate(1192 0)"><rect width="70" height="30" rx="6" fill="#2A2A35" stroke="${INK}" stroke-width="4"/><path class="pB" d="M8 30 Q35 -16 62 30 Z" fill="#3D8BFF" stroke="${INK}" stroke-width="4"/><path d="M20 22 Q30 6 40 10" stroke="#CFE2FF" stroke-width="4" fill="none" stroke-linecap="round"/></g>
  ${withBoard ? `<g transform="translate(160 218)">
    <rect x="-8" y="-8" width="976" height="366" rx="18" fill="#05080F" opacity=".45" transform="translate(12 14)"/>
    <rect width="960" height="350" rx="16" fill="url(#wood)" stroke="${INK}" stroke-width="6"/>
    <path d="M20 8 Q300 14 600 6 T940 10" stroke="#B9804C" stroke-width="2" fill="none" opacity=".6"/>
    <rect x="22" y="22" width="916" height="306" rx="6" fill="url(#cork)" stroke="${INK}" stroke-width="5"/>
    <rect x="22" y="22" width="916" height="306" rx="6" fill="#000" opacity=".08"/>
    <g transform="translate(70 238) rotate(-6)"><rect width="120" height="74" fill="#FFF8EA" stroke="${INK}" stroke-width="3"/><path d="M12 18 H96 M12 32 H108 M12 46 H80 M12 60 H100" stroke="#9B9384" stroke-width="3"/></g>
    <g transform="translate(800 250) rotate(7)"><rect width="110" height="64" fill="#FFF8EA" stroke="${INK}" stroke-width="3"/><path d="M10 16 H90 M10 30 H98 M10 44 H70" stroke="#9B9384" stroke-width="3"/></g>
  </g>` : ""}
  <rect width="1280" height="720" fill="url(#vignette)"/>
  <g fill="#FFE9D6">${[[120,520,0],[210,600,1.4],[80,660,2.8],[1150,560,.7],[1210,640,2.1],[1090,690,3.6],[640,700,4.4],[420,690,5.2]].map(([x,y,d])=>`<circle class="dust" cx="${x}" cy="${y}" r="2.5" style="animation-delay:${d}s"/>`).join("")}</g>
  </svg>`;
}

function title(small){
  const s = small ? .62 : 1;
  return `<div style="position:absolute;left:0;right:0;top:${small?10:18}px;display:flex;flex-direction:column;align-items:center;transform:scale(${s});transform-origin:50% 0">
    <div class="bob" style="display:flex;align-items:center;gap:22px">
      <svg aria-hidden="true" width="88" height="100" viewBox="0 0 88 100"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE48A"/><stop offset=".5" stop-color="#FFC23D"/><stop offset="1" stop-color="#D98E12"/></linearGradient></defs><path d="M44 4 L54 14 L70 10 L72 26 L84 36 L76 50 L84 64 L72 74 L70 90 L54 86 L44 96 L34 86 L18 90 L16 74 L4 64 L12 50 L4 36 L16 26 L18 10 L34 14 Z" fill="url(#gold)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="44" cy="50" r="22" fill="#2F5DA8" stroke="${INK}" stroke-width="4"/><path d="M44 34 L48 45 L59 45 L50 52 L53 63 L44 56 L35 63 L38 52 L29 45 L40 45 Z" fill="#FFE48A" stroke="${INK}" stroke-width="2"/></svg>
      <h1 style="margin:0;font-family:'Lilita One';font-size:108px;line-height:.95;color:#FF5A5F;-webkit-text-stroke:7px ${INK};paint-order:stroke fill;text-shadow:0 9px 0 ${INK},0 0 60px rgba(255,77,94,.55);letter-spacing:2px">LE PIRE DUO</h1>
      <svg aria-hidden="true" width="110" height="80" viewBox="0 0 110 80"><circle cx="30" cy="44" r="22" fill="none" stroke="${INK}" stroke-width="13"/><circle cx="30" cy="44" r="22" fill="none" stroke="#C9D2E3" stroke-width="7"/><circle cx="80" cy="44" r="22" fill="none" stroke="${INK}" stroke-width="13"/><circle cx="80" cy="44" r="22" fill="none" stroke="#C9D2E3" stroke-width="7"/><rect x="46" y="38" width="18" height="12" rx="3" fill="#C9D2E3" stroke="${INK}" stroke-width="4"/></svg>
    </div>
    <div style="position:relative;margin-top:4px;transform:rotate(-2deg)">
      <svg aria-hidden="true" width="470" height="70" viewBox="0 0 470 70" style="position:absolute;left:-20px;top:-6px"><path d="M0 14 L40 10 L30 36 L40 62 L0 58 Z" fill="#C98A16" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M470 14 L430 10 L440 36 L430 62 L470 58 Z" fill="#C98A16" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="26" y="4" width="418" height="54" rx="6" fill="#FFC23D" stroke="${INK}" stroke-width="5"/><path d="M40 14 H430" stroke="#FFE48A" stroke-width="4" stroke-linecap="round"/></svg>
      <div style="position:relative;width:430px;text-align:center;font-family:'Lilita One';font-size:40px;letter-spacing:3px">VA EN PRISON</div>
    </div>
  </div>`;
}

function tape(){
  return `<svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs><pattern id="tape" width="56" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="56" height="40" fill="#FFC23D"/><rect width="26" height="40" fill="${INK}"/></pattern></defs>
    <g transform="translate(-90 700) rotate(-38)"><rect width="380" height="50" fill="url(#tape)" stroke="${INK}" stroke-width="5"/><rect x="80" y="8" width="230" height="34" fill="#FFC23D"/><text x="195" y="35" text-anchor="middle" font-family="Lilita One" font-size="24" fill="${INK}">NE PAS FRANCHIR</text></g>
    <g transform="translate(1040 760) rotate(-38)"><rect width="380" height="50" fill="url(#tape)" stroke="${INK}" stroke-width="5"/><rect x="80" y="8" width="230" height="34" fill="#FFC23D"/><text x="195" y="35" text-anchor="middle" font-family="Lilita One" font-size="24" fill="${INK}">SCÈNE DE CRIME</text></g></svg>`;
}

function desk(){
  return `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <linearGradient id="plank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C6334"/><stop offset="1" stop-color="#7E4B22"/></linearGradient>
    <linearGradient id="manila" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2C878"/><stop offset="1" stop-color="#DDA752"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect y="0" width="1280" height="150" fill="url(#plank)"/><rect y="150" width="1280" height="150" fill="#8F5A2D"/><rect y="300" width="1280" height="150" fill="url(#plank)"/><rect y="450" width="1280" height="150" fill="#8A552A"/><rect y="600" width="1280" height="120" fill="url(#plank)"/>
    <g stroke="#5A3216" stroke-width="4"><line x1="0" y1="150" x2="1280" y2="150"/><line x1="0" y1="300" x2="1280" y2="300"/><line x1="0" y1="450" x2="1280" y2="450"/><line x1="0" y1="600" x2="1280" y2="600"/></g>
    <g fill="none" stroke="#6E3E19" stroke-width="2" opacity=".7"><path d="M0 60 Q200 40 420 70 T900 50 T1280 66"/><path d="M0 220 Q260 200 520 228 T1000 210 T1280 226"/><path d="M0 370 Q300 350 560 380 T1080 360 T1280 372"/><path d="M0 520 Q240 540 500 512 T980 530 T1280 518"/><path d="M0 660 Q280 640 600 668 T1280 650"/></g>
    <circle cx="1120" cy="150" r="70" fill="none" stroke="#4E2A10" stroke-width="7" opacity=".35"/>
    <g transform="translate(1080 60)">
      <ellipse cx="60" cy="150" rx="74" ry="18" fill="#000" opacity=".35" filter="url(#soft)"/>
      <path d="M110 70 Q160 70 158 104 Q156 136 108 132" fill="none" stroke="${INK}" stroke-width="20"/><path d="M110 70 Q160 70 158 104 Q156 136 108 132" fill="none" stroke="#2F5DA8" stroke-width="10"/>
      <path d="M0 30 L120 30 L112 150 Q60 164 8 150 Z" fill="#2F5DA8" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <ellipse cx="60" cy="30" rx="60" ry="16" fill="#3D2416" stroke="${INK}" stroke-width="6"/><ellipse cx="52" cy="28" rx="30" ry="6" fill="#6B4129"/>
      <path d="M22 66 L28 136" stroke="#6E9BE0" stroke-width="7" stroke-linecap="round"/>
      <text x="60" y="104" text-anchor="middle" font-family="Lilita One" font-size="20" fill="#FFF8EA">POLICE</text>
      <path class="steam" d="M40 -6 Q30 -26 44 -44 Q56 -60 46 -80" fill="none" stroke="#FFF8EA" stroke-width="5" stroke-linecap="round"/>
      <path class="steam" style="animation-delay:1.2s" d="M74 -2 Q86 -24 72 -42 Q62 -58 74 -76" fill="none" stroke="#FFF8EA" stroke-width="5" stroke-linecap="round"/>
      <path class="steam" style="animation-delay:2.1s" d="M58 0 Q50 -20 60 -36 Q68 -50 60 -66" fill="none" stroke="#FFF8EA" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g transform="translate(70 560) rotate(-18)"><rect width="260" height="22" rx="4" fill="#FFC23D" stroke="${INK}" stroke-width="4"/><rect width="34" height="22" rx="3" fill="#FF9AA8" stroke="${INK}" stroke-width="4"/><rect x="34" width="16" height="22" fill="#C9D2E3" stroke="${INK}" stroke-width="4"/><path d="M260 0 L300 11 L260 22 Z" fill="#F2D2A0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M288 7 L300 11 L288 15 Z" fill="${INK}"/></g>
    <g transform="translate(60 120) rotate(14)"><circle cx="30" cy="30" r="26" fill="none" stroke="${INK}" stroke-width="12"/><circle cx="30" cy="30" r="26" fill="none" stroke="#C9D2E3" stroke-width="6"/><circle cx="96" cy="44" r="26" fill="none" stroke="${INK}" stroke-width="12"/><circle cx="96" cy="44" r="26" fill="none" stroke="#C9D2E3" stroke-width="6"/><path d="M54 36 L72 40" stroke="${INK}" stroke-width="10"/><path d="M54 36 L72 40" stroke="#C9D2E3" stroke-width="4"/></g>
    <g transform="translate(170 64)">
      <rect x="10" y="12" width="904" height="600" rx="14" fill="#000" opacity=".4" filter="url(#soft)"/>
      <path d="M0 18 L120 18 L140 0 L300 0 L320 18 L900 18 Q912 18 912 30 L912 590 Q912 602 900 602 L12 602 Q0 602 0 590 Z" fill="url(#manila)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <line x1="456" y1="24" x2="456" y2="596" stroke="#B9873A" stroke-width="5"/>
      <rect x="28" y="42" width="410" height="536" rx="4" fill="#FFF8EA" stroke="${INK}" stroke-width="4"/>
      <g stroke="#CFE0F5" stroke-width="2">${[150,186,222,258,294,330,366,402,438].map(y=>`<line x1="40" y1="${y}" x2="426" y2="${y}"/>`).join("")}</g>
      <line x1="76" y1="44" x2="76" y2="576" stroke="#F4A7A7" stroke-width="2"/>
      <rect x="474" y="42" width="410" height="536" rx="4" fill="#FFF3DC" stroke="${INK}" stroke-width="4" transform="rotate(1.2 680 310)"/>
      <g transform="translate(70 24)"><path d="M0 18 L0 -6 Q0 -18 12 -18 Q24 -18 24 -6 L24 40 Q24 52 12 52 Q2 52 2 40 L2 4" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M0 18 L0 -6 Q0 -18 12 -18 Q24 -18 24 -6 L24 40 Q24 52 12 52 Q2 52 2 40 L2 4" fill="none" stroke="#C9D2E3" stroke-width="3.5" stroke-linecap="round"/></g>
    </g></svg>`;
}
function deskLight(){
  return `<svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs><radialGradient id="lampD" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".5"/><stop offset=".5" stop-color="#FFC66B" stop-opacity=".1"/><stop offset="1" stop-color="#120A04" stop-opacity=".45"/></radialGradient></defs><rect class="flicker" width="1280" height="720" fill="url(#lampD)"/></svg>`;
}

function stopwatch(){
  return `<svg aria-hidden="true" width="110" height="122" viewBox="0 0 110 122"><rect x="44" width="22" height="14" rx="3" fill="#C9D2E3" stroke="${INK}" stroke-width="4"/><rect x="49" y="12" width="12" height="10" fill="#C9D2E3" stroke="${INK}" stroke-width="4"/><circle cx="55" cy="70" r="48" fill="#FF5A5F" stroke="${INK}" stroke-width="6"/><circle cx="55" cy="70" r="37" fill="#FFF8EA" stroke="${INK}" stroke-width="4"/><g class="spin"><circle cx="55" cy="70" r="34" fill="none"/><line x1="55" y1="70" x2="55" y2="40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></g><circle cx="55" cy="70" r="6" fill="${INK}"/></svg>`;
}

function room(){
  return `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E5A66"/><stop offset="1" stop-color="#5E8089"/></linearGradient>
    <pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#8FC7B3"/><rect x="2" y="2" width="36" height="36" rx="3" fill="#A6D8C5"/><path d="M6 8 L14 8" stroke="#D8F2E8" stroke-width="3" stroke-linecap="round"/></pattern>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".65"/><stop offset="1" stop-color="#FFF1B8" stop-opacity=".05"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B4250"/><stop offset="1" stop-color="#14222C"/></linearGradient>
    <linearGradient id="table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A86A3A"/><stop offset="1" stop-color="#6E3F1C"/></linearGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".9"/><stop offset="1" stop-color="#FFF1B8" stop-opacity="0"/></radialGradient>
    <radialGradient id="vigI" cx=".45" cy=".4" r=".8"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05080F" stop-opacity=".6"/></radialGradient>
    <filter id="blurI"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <rect width="1280" height="440" fill="url(#wall)"/>
    <g fill="#2E4650" opacity=".35"><ellipse cx="160" cy="380" rx="90" ry="30"/><path d="M700 0 Q706 60 698 120 Q692 150 700 180 L708 180 Q700 120 712 0 Z"/></g>
    <rect y="430" width="1280" height="150" fill="url(#tiles)"/><rect y="424" width="1280" height="14" fill="#2E4650" stroke="${INK}" stroke-width="4"/>
    <g transform="translate(756 306)"><circle cx="50" cy="50" r="50" fill="#FFF8EA" stroke="${INK}" stroke-width="6"/><circle cx="50" cy="50" r="40" fill="none" stroke="#C9D2E3" stroke-width="2"/><g stroke="${INK}" stroke-width="3" stroke-linecap="round"><line x1="50" y1="14" x2="50" y2="20"/><line x1="86" y1="50" x2="80" y2="50"/><line x1="50" y1="86" x2="50" y2="80"/><line x1="14" y1="50" x2="20" y2="50"/></g><line x1="50" y1="50" x2="50" y2="24" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><line x1="50" y1="50" x2="70" y2="58" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><g class="spin"><circle cx="50" cy="50" r="30" fill="none"/><line x1="50" y1="50" x2="50" y2="22" stroke="#FF5A5F" stroke-width="2.5" stroke-linecap="round"/></g><circle cx="50" cy="50" r="5" fill="#FF5A5F" stroke="${INK}" stroke-width="2"/></g>
    <g transform="translate(880 64)">
      <rect x="-10" y="-10" width="380" height="340" rx="10" fill="#9AA6B8" stroke="${INK}" stroke-width="6"/><rect width="360" height="320" rx="4" fill="url(#glass)" stroke="${INK}" stroke-width="4"/>
      <g fill="#0B141A" opacity=".8" class="ghost"><circle cx="120" cy="190" r="40"/><path d="M60 320 Q60 236 120 232 Q180 236 180 320 Z"/><circle cx="250" cy="200" r="38"/><path d="M195 320 Q195 244 250 240 Q305 244 305 320 Z"/></g>
      <g fill="#FFF8EA" opacity=".9" class="blink" style="animation-delay:1.7s"><circle cx="108" cy="186" r="5"/><circle cx="132" cy="186" r="5"/><circle cx="238" cy="196" r="5"/><circle cx="262" cy="196" r="5"/></g>
      <path d="M20 20 L120 20 L20 140 Z" fill="#FFF" opacity=".08"/><line x1="40" y1="40" x2="140" y2="0" stroke="#FFF" stroke-width="6" opacity=".12"/>
      <rect x="110" y="330" width="140" height="26" rx="4" fill="#C9D2E3" stroke="${INK}" stroke-width="3"/>
      <text x="180" y="349" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="13" fill="${INK}" id="mirrorLabel">L'AUTRE DUO OBSERVE</text>
    </g>
    <g class="swing">
      <polygon points="512,124 568,124 830,600 250,600" fill="url(#cone)" style="mix-blend-mode:screen"/>
      <line x1="540" y1="0" x2="540" y2="70" stroke="${INK}" stroke-width="6"/>
      <circle cx="540" cy="120" r="70" fill="url(#halo)"/>
      <path d="M490 72 L590 72 L604 118 L476 118 Z" fill="#2E8B6E" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M560 76 L596 116 L604 118 L590 72 Z" fill="#1F6650"/>
      <path d="M490 72 L590 72 L604 118 L476 118 Z" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M500 82 L530 82" stroke="#6FD6B8" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="540" cy="120" rx="34" ry="9" fill="#FFF8D2" stroke="${INK}" stroke-width="4"/>
      <g fill="#FFF8D2">${[[470,420,0],[560,360,1.3],[640,470,2.4],[520,520,3.5],[700,400,.8],[420,500,4.1]].map(([x,y,d])=>`<circle class="dust2" cx="${x}" cy="${y}" r="2.5" style="animation-delay:${d}s"/>`).join("")}</g>
    </g>
    <g transform="translate(40 150)">${ART.inspector()}</g>
    <path d="M120 580 L1160 580 L1280 720 L0 720 Z" fill="url(#table)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M140 592 Q600 586 1140 594" stroke="#C88A52" stroke-width="4" fill="none" opacity=".6"/>
    <g transform="translate(240 552)"><ellipse cx="40" cy="66" rx="58" ry="12" fill="#000" opacity=".35" filter="url(#blurI)"/><path d="M78 20 Q108 20 106 40 Q104 58 78 56" fill="none" stroke="${INK}" stroke-width="14"/><path d="M78 20 Q108 20 106 40 Q104 58 78 56" fill="none" stroke="#FFF8EA" stroke-width="6"/><path d="M0 6 L82 6 L76 68 Q40 76 6 68 Z" fill="#FFF8EA" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="41" cy="6" rx="41" ry="10" fill="#3D2416" stroke="${INK}" stroke-width="5"/><text x="41" y="48" text-anchor="middle" font-family="Lilita One" font-size="13" fill="#2F5DA8">N°1 DES FLICS</text></g>
    <g transform="translate(430 470)">
      <rect x="40" width="340" height="130" fill="#FFF" stroke="${INK}" stroke-width="5"/>
      <g stroke="#E1E8F2" stroke-width="2"><line x1="56" y1="40" x2="364" y2="40"/><line x1="56" y1="72" x2="364" y2="72"/><line x1="56" y1="104" x2="364" y2="104"/></g>
      <path d="M0 120 L420 120 L440 250 L-20 250 Z" fill="#2B2D3A" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <rect x="10" y="104" width="400" height="34" rx="16" fill="#3E4155" stroke="${INK}" stroke-width="5"/>
      <circle cx="10" cy="121" r="18" fill="#C9D2E3" stroke="${INK}" stroke-width="5"/><circle cx="410" cy="121" r="18" fill="#C9D2E3" stroke="${INK}" stroke-width="5"/>
      <g fill="#F2E7D0" stroke="${INK}" stroke-width="3">${[40,74,108,142,176,210,244,278,312,346,380].map(x=>`<circle cx="${x}" cy="172" r="12"/>`).join("")}${[56,90,124,158,192,226,260,294,328,362].map(x=>`<circle cx="${x}" cy="204" r="12"/>`).join("")}</g>
      <text x="210" y="150" text-anchor="middle" font-family="Lilita One" font-size="14" fill="#FFC23D" letter-spacing="3">OLIVETTI DU POSTE</text>
    </g>
    <rect width="1280" height="720" fill="url(#vigI)" style="pointer-events:none"/></svg>`;
}

function burst(){
  return `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3" fill="#E8890F" opacity=".55"/></pattern>
    <radialGradient id="burstFade" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#FFE48A" stop-opacity=".9"/><stop offset="1" stop-color="#FFE48A" stop-opacity="0"/></radialGradient>
    <linearGradient id="board" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A6234"/><stop offset="1" stop-color="#6D3F1C"/></linearGradient></defs>
    <rect width="1280" height="720" fill="#FFB21F"/>
    <g class="spinSlow"><g transform="translate(640 400)" fill="#FFC23D">${Array.from({length:12},(_,i)=>`<path d="M0 0 L-140 -900 L140 -900 Z" transform="rotate(${i*30})"/>`).join("")}</g></g>
    <rect width="1280" height="720" fill="url(#dots)"/><rect width="1280" height="720" fill="url(#burstFade)"/>
    <g transform="translate(150 148)"><rect width="420" height="440" rx="18" fill="url(#board)" stroke="${INK}" stroke-width="6" transform="rotate(-4 210 220)"/></g>
    <g transform="translate(710 148)"><rect width="420" height="440" rx="18" fill="url(#board)" stroke="${INK}" stroke-width="6" transform="rotate(3 210 220)"/></g>
    ${[[100,0],[420,2.2],[880,4.1],[1180,1.1],[640,5.3]].map(([x,d])=>`<rect class="fall" x="${x}" y="0" width="20" height="26" fill="#FFF8EA" stroke="${INK}" stroke-width="3" style="animation-delay:${d}s"/>`).join("")}
  </svg>`;
}

function cellBack(){
  return `<svg class="layer" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <linearGradient id="chart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DFCB"/><stop offset="1" stop-color="#CFC2A6"/></linearGradient>
    <linearGradient id="spotV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4C8" stop-opacity=".5"/><stop offset="1" stop-color="#FFF4C8" stop-opacity=".04"/></linearGradient>
    <radialGradient id="redV" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF4D5E" stop-opacity=".55"/><stop offset="1" stop-color="#FF4D5E" stop-opacity="0"/></radialGradient>
    <linearGradient id="alarmBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4D5E" stop-opacity=".55"/><stop offset="1" stop-color="#FF4D5E" stop-opacity="0"/></linearGradient></defs>
    <rect width="1280" height="720" fill="#0E1526"/>
    <rect width="820" height="560" fill="url(#chart)"/>
    <g stroke="${INK}" stroke-width="3" opacity=".28">${[140,220,300,380,460].map(y=>`<line x1="0" y1="${y}" x2="820" y2="${y}"/>`).join("")}</g>
    <g stroke="${INK}" stroke-width="2" opacity=".15">${[180,260,340,420,500].map(y=>`<line x1="0" y1="${y}" x2="820" y2="${y}"/>`).join("")}</g>
    <g fill="${INK}" opacity=".4" font-family="Lilita One" font-size="18">${["2m00","1m80","1m60","1m40","1m20"].map((t,i)=>`<text x="64" y="${134+i*80}">${t}</text><text x="700" y="${134+i*80}">${t}</text>`).join("")}</g>
    <rect y="560" width="820" height="160" fill="#4A4F5E"/><path d="M0 560 H820" stroke="${INK}" stroke-width="6"/>
    <g stroke="#3A3E4B" stroke-width="3"><line x1="0" y1="620" x2="820" y2="620"/><line x1="0" y1="680" x2="820" y2="680"/><line x1="200" y1="560" x2="150" y2="720"/><line x1="420" y1="560" x2="420" y2="720"/><line x1="640" y1="560" x2="690" y2="720"/></g>
    <polygon points="290,0 540,0 790,640 40,640" fill="url(#spotV)"/>
    <ellipse cx="412" cy="600" rx="330" ry="30" fill="#FFF4C8" opacity=".2"/>
    <polygon class="sweep" points="740,118 560,720 920,720" fill="url(#alarmBeam)" style="mix-blend-mode:screen"/>
    <circle class="pulse" cx="740" cy="104" r="90" fill="url(#redV)"/>
  </svg>`;
}
function cellFront(){
  const xs = [40,170,336,404,472,638,770];
  return `<svg class="layer" style="pointer-events:none" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden="true"><defs>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E3647"/><stop offset=".3" stop-color="#DDE4F0"/><stop offset=".5" stop-color="#8592AA"/><stop offset="1" stop-color="#2E3647"/></linearGradient>
    <linearGradient id="hbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3647"/><stop offset=".35" stop-color="#DDE4F0"/><stop offset="1" stop-color="#2E3647"/></linearGradient>
    <radialGradient id="vigV" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05080F" stop-opacity=".8"/></radialGradient>
    <radialGradient id="redV2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF4D5E" stop-opacity=".55"/><stop offset="1" stop-color="#FF4D5E" stop-opacity="0"/></radialGradient></defs>
    <g class="slamIn">
      <g stroke="${INK}" stroke-width="5">${xs.map(x=>`<rect x="${x}" y="0" width="20" height="720" rx="4" fill="url(#bar)"/>`).join("")}<rect y="38" width="820" height="30" fill="url(#hbar)"/><rect y="642" width="820" height="30" fill="url(#hbar)"/></g>
      <g fill="${INK}">${xs.map(x=>`<circle cx="${x+10}" cy="53" r="4"/><circle cx="${x+10}" cy="657" r="4"/>`).join("")}</g>
      <g transform="translate(382 80)"><rect width="64" height="76" rx="8" fill="#C9D2E3" stroke="${INK}" stroke-width="5"/><rect x="6" y="6" width="52" height="6" rx="3" fill="#FFF" opacity=".6"/><circle cx="32" cy="32" r="9" fill="${INK}"/><path d="M28 36 L36 36 L38 58 L26 58 Z" fill="${INK}"/></g>
    </g>
    <rect x="712" y="88" width="56" height="16" rx="4" fill="#2A2A35" stroke="${INK}" stroke-width="4"/>
    <path class="pulse" d="M718 104 Q740 68 762 104 Z" fill="#FF4D5E" stroke="${INK}" stroke-width="4"/>
    <rect width="820" height="720" fill="url(#vigV)"/>
    <rect x="820" width="460" height="720" fill="#16213A"/><path d="M820 0 V720" stroke="${INK}" stroke-width="8"/>
    <circle cx="1240" cy="40" r="300" fill="url(#redV2)"/>
  </svg>`;
}

window.SCENES = { precinct, title, tape, desk, deskLight, stopwatch, room, burst, cellBack, cellFront, grainLayer };
})();
