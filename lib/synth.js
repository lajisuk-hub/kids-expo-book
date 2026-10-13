// 브라우저 안에서 소리를 직접 만든다(파일 없음). 악기 3종: 피아노·실로폰·오르골
let ctx = null;
export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
export const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

export const INSTRUMENTS = [
  { id: "piano", name: "피아노", emoji: "🎹" },
  { id: "xylo", name: "실로폰", emoji: "🎶" },
  { id: "music-box", name: "오르골", emoji: "🎠" },
];

// 한 음 울리기. when(초, AudioContext 시간) 생략하면 지금.
export function playNote(midi, inst = "piano", when) {
  const ac = audio();
  const t0 = when ?? ac.currentTime;
  const f = freq(midi);
  const out = ac.createGain();
  out.connect(ac.destination);
  const voices = inst === "piano"
    ? [[1, 1, "triangle"], [2, 0.35, "sine"], [3, 0.12, "sine"]]
    : inst === "xylo"
      ? [[1, 1, "sine"], [2.76, 0.4, "sine"], [5.4, 0.15, "sine"]]
      : [[1, 1, "sine"], [2, 0.5, "sine"], [4, 0.18, "sine"]];
  const decay = inst === "piano" ? 1.6 : inst === "xylo" ? 0.7 : 2.4;
  const peak = inst === "xylo" ? 0.5 : 0.4;
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  out.gain.exponentialRampToValueAtTime(0.001, t0 + decay);
  for (const [mul, amp, type] of voices) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    g.gain.value = amp / voices.length;
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + decay + 0.05);
  }
}

// 녹음된 음표들 재생: notes = [{n, t(ms)}]
export function playSong(notes, inst, onNote) {
  const ac = audio();
  const start = ac.currentTime + 0.08;
  const timers = [];
  for (const nt of notes) {
    playNote(nt.n, inst, start + nt.t / 1000);
    if (onNote) timers.push(setTimeout(() => onNote(nt), nt.t + 80));
  }
  return () => timers.forEach(clearTimeout);
}

// 건반: 도(60)~도(72), 흰건반 8개 + 검은건반 5개
export const WHITE = [
  { n: 60, label: "도", color: "#ff6b6b" },
  { n: 62, label: "레", color: "#ff9f43" },
  { n: 64, label: "미", color: "#ffd93d" },
  { n: 65, label: "파", color: "#6bcb77" },
  { n: 67, label: "솔", color: "#4d96ff" },
  { n: 69, label: "라", color: "#845ec2" },
  { n: 71, label: "시", color: "#ff6fb5" },
  { n: 72, label: "도", color: "#ff6b6b" },
];
export const BLACK = [
  { n: 61, after: 0 }, { n: 63, after: 1 }, { n: 66, after: 3 }, { n: 68, after: 4 }, { n: 70, after: 5 },
];
export const NAME_OF = Object.fromEntries(WHITE.map((w) => [w.n, w.label]));
