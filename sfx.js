// Sons générés en WebAudio + voix de l'inspecteur
(function(){
let ctx = null, master = null, muted = false;
try { muted = localStorage.getItem("pd_muted") === "1"; } catch(e){}

function ac(){
  if(!ctx){
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return null;
    ctx = new C(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  }
  if(ctx.state === "suspended") ctx.resume();
  return ctx;
}
function noiseBuf(dur){
  const c = ac(); const b = c.createBuffer(1, Math.floor(c.sampleRate*dur), c.sampleRate);
  const d = b.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1; return b;
}
function env(g, t, a, peak, dec){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec); }
function tone(freq, dur, type="sine", vol=.3, when=0, slide=null){
  const c = ac(); if(!c||muted) return; const t = c.currentTime+when;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq,t);
  if(slide) o.frequency.exponentialRampToValueAtTime(slide, t+dur);
  env(g,t,.01,vol,dur); o.connect(g).connect(master); o.start(t); o.stop(t+dur+.05);
}
function noise(dur, vol=.3, when=0, filt=2000, type="lowpass"){
  const c = ac(); if(!c||muted) return; const t = c.currentTime+when;
  const s = c.createBufferSource(); s.buffer = noiseBuf(dur+.05);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filt;
  const g = c.createGain(); env(g,t,.005,vol,dur); s.connect(f).connect(g).connect(master); s.start(t);
}

const SFX = {
  click(){ noise(.03,.25,0,4000,"highpass"); },
  type(){ noise(.025,.22,0,3000,"bandpass"); tone(1800,.02,"square",.03); },
  ding(){ tone(1568,.5,"triangle",.18); },
  stamp(){ tone(90,.25,"sine",.7,0,40); noise(.12,.5,0,900); },
  match(){ this.stamp(); tone(660,.15,"triangle",.2,.12); tone(990,.25,"triangle",.2,.24); },
  fail(){ this.stamp(); tone(220,.35,"sawtooth",.14,.12,150); },
  tick(){ tone(1200,.03,"square",.06); },
  urgent(){ tone(880,.06,"square",.08); },
  siren(){ for(let i=0;i<4;i++){ tone(700,.32,"sawtooth",.07,i*.64,980); tone(980,.32,"sawtooth",.07,i*.64+.32,700); } },
  slam(){ noise(.5,.6,0,500); tone(70,.6,"sine",.8,0,35); noise(.25,.35,.08,3000,"highpass"); },
  paper(){ noise(.18,.18,0,2500,"bandpass"); },
  join(){ tone(523,.12,"triangle",.15); tone(784,.18,"triangle",.15,.1); },
  pop(){ tone(880,.08,"triangle",.15,0,1320); },
  win(){ [523,659,784,1047].forEach((f,i)=>tone(f,.25,"triangle",.18,i*.12)); }
};

function speak(text, opts={}){
  if(muted || !("speechSynthesis" in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith("fr"));
    const pref = vs.find(v => /thomas|paul|male|homme|henri|daniel/i.test(v.name)) || vs[0];
    if(pref) u.voice = pref;
    u.lang = "fr-FR"; u.rate = opts.rate || 0.98; u.pitch = opts.pitch || 0.55; u.volume = 1;
    speechSynthesis.speak(u);
  }catch(e){}
}

window.AUDIO = {
  sfx: (name) => { if(!muted && SFX[name]) { try{ SFX[name](); }catch(e){} } },
  speak,
  unlock(){ ac(); },
  isMuted: () => muted,
  toggle(){ muted = !muted; try{ localStorage.setItem("pd_muted", muted?"1":"0"); }catch(e){} if(muted && "speechSynthesis" in window) speechSynthesis.cancel(); return muted; }
};
})();
