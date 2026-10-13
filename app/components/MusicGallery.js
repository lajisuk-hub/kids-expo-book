"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadItems } from "../../lib/supabase";
import { INSTRUMENTS, playSong, NAME_OF } from "../../lib/synth";
import Pano from "./Pano";
import TopBar, { Ticker } from "./TopBar";
import Piano from "./Piano";

export const NOTE_GLYPHS = ["♪", "♫", "♩", "♬"];
export const CARD_COLORS = ["#ff6b6b", "#ff9f43", "#ffd93d", "#6bcb77", "#4d96ff", "#845ec2", "#ff6fb5"];
export const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export const instOf = (id) => INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0];

// 악기 모양 카드: 피아노(건반) · 실로폰(알록달록 막대와 채) · 오르골(뚜껑 열린 상자 위 춤추는 인형)
function PianoShape({ c }) {
  return (
    <svg viewBox="0 0 100 100" className="inst-svg">
      <path d="M14 30 Q14 14 30 14 H78 Q90 14 90 28 V62 Q90 70 82 70 H18 Q10 70 10 62 V34 Z" fill={c} />
      <path d="M22 24 H76 Q82 24 82 30 V40 H16 V30 Q16 24 22 24 Z" fill="#fff" opacity=".22" />
      <rect x="10" y="56" width="80" height="22" rx="4" fill="#fffdf7" stroke="#3a2d2a" strokeWidth="2" />
      {[0,1,2,3,4,5,6].map((i) => <line key={i} x1={10 + (i + 1) * 80 / 7.0} y1="56" x2={10 + (i + 1) * 80 / 7.0} y2="78" stroke="#c9b8a8" strokeWidth="1.5" />)}
      {[0,1,3,4,5].map((i) => <rect key={i} x={10 + (i + 0.72) * 80 / 7} y="56" width="6.4" height="13" rx="1" fill="#3a2d2a" />)}
      <rect x="18" y="78" width="6" height="12" fill="#3a2d2a" /><rect x="76" y="78" width="6" height="12" fill="#3a2d2a" />
      <text x="50" y="47" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Jua, sans-serif">♪</text>
    </svg>
  );
}
function XyloShape({ c }) {
  const bars = ["#ff6b6b", "#ff9f43", "#ffd93d", "#6bcb77", "#4d96ff", "#845ec2"];
  return (
    <svg viewBox="0 0 100 100" className="inst-svg">
      <path d="M16 22 H84 L92 80 H8 Z" fill="#d9b07a" stroke="#9a6b32" strokeWidth="2" strokeLinejoin="round" />
      {bars.map((col, i) => { const w = 60 - i * 7; const y = 28 + i * 9; return <rect key={i} x={50 - w / 2} y={y} width={w} height="7" rx="3.5" fill={col} stroke="#3a2d2a" strokeWidth="1.2" />; })}
      <g stroke="#6b4f3a" strokeWidth="3" strokeLinecap="round"><line x1="22" y1="92" x2="42" y2="66" /><line x1="78" y1="92" x2="58" y2="66" /></g>
      <circle cx="42" cy="64" r="5" fill={c} stroke="#3a2d2a" strokeWidth="1.2" /><circle cx="58" cy="64" r="5" fill={c} stroke="#3a2d2a" strokeWidth="1.2" />
    </svg>
  );
}
function BoxShape({ c }) {
  return (
    <svg viewBox="0 0 100 100" className="inst-svg">
      <path d="M18 52 H82 L86 86 H14 Z" fill="#b8865a" stroke="#6b4f3a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="22" y="58" width="56" height="8" rx="2" fill="#fff" opacity=".2" />
      <path d="M18 52 L30 24 H78 L82 52 Z" fill={c} stroke="#6b4f3a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M34 30 H74 L77 46 H30 Z" fill="#fff" opacity=".35" />
      <circle cx="54" cy="36" r="5.5" fill="#ffe0c2" stroke="#3a2d2a" strokeWidth="1.2" />
      <path d="M54 42 L47 58 H61 Z" fill="#ff6fb5" stroke="#3a2d2a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M50 46 L40 40 M58 46 L68 40" stroke="#3a2d2a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M86 66 H93 V72" fill="none" stroke="#6b4f3a" strokeWidth="3" strokeLinecap="round" />
      <text x="24" y="22" fontSize="11" fill="#ffd93d">✦</text><text x="76" y="18" fontSize="9" fill="#ffd93d">✦</text>
    </svg>
  );
}
export function renderSong(it) {
  const h = hash(it.id);
  const c = CARD_COLORS[h % CARD_COLORS.length];
  const inst = instOf(it.inst);
  return (
    <span className={`song inst-${inst.id}`} style={{ "--c": c }}>
      <i className="song-float" style={{ animationDelay: `${(h % 10) / 10}s` }}>{NOTE_GLYPHS[(h >> 4) % NOTE_GLYPHS.length]}</i>
      {inst.id === "piano" ? <PianoShape c={c} /> : inst.id === "xylo" ? <XyloShape c={c} /> : <BoxShape c={c} />}
      <b>{it.name || "이름 없는 친구"}</b>
    </span>
  );
}

export default function MusicGallery({ space }) {
  const { code, name } = space;
  const [items, setItems] = useState([]);
  const [piano, setPiano] = useState(false);
  const [picked, setPicked] = useState(null);
  const [mine, setMine] = useState(null);
  const [toast, setToast] = useState("");
  const [small, setSmall] = useState(false);
  const since = useRef(null);
  const pano = useRef(null);

  useEffect(() => {
    const on = () => setSmall(window.innerWidth < 700);
    on(); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on);
  }, []);
  const merge = useCallback((rows) => {
    if (!rows.length) return;
    for (const r of rows) if (!since.current || r.at > since.current) since.current = r.at;
    setItems((prev) => { const by = new Map(prev.map((r) => [r.id, r])); for (const r of rows) by.set(r.id, r); return [...by.values()]; });
  }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => { try { const rows = await loadItems("m", code, since.current); if (!stop) merge(rows); } catch {} };
    tick(); const id = setInterval(tick, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [code, merge]);

  const visible = useMemo(() => items.filter((i) => !i.hidden && Array.isArray(i.notes) && i.notes.length).sort((a, b) => (a.id < b.id ? -1 : 1)), [items]);
  const n = visible.length;
  const size = small ? (n > 30 ? 92 : 112) : n > 40 ? 116 : 150;

  const onSaved = (item) => {
    setPiano(false); merge([item]); setMine(item.id); setTimeout(() => pano.current?.goTo(item.id), 80);
    setToast("내 노래가 전시장에 떠올랐어요! 🎉"); setTimeout(() => setToast(""), 3500);
  };

  return (
    <main className="gallery music-g">
      <TopBar code={code} org={name} title="음악 전시" color="#6bcb77" />
      <Ticker />
      <Pano
        ref={pano}
        startImg={2}
        paused={!!(piano || picked)}
        items={visible}
        size={size}
        mineId={mine}
        onPick={setPicked}
        render={renderSong}
      />
      <div className="g-title">
        <h1>내가 만든 노래 전시</h1>
        <p>{n > 0 ? `노래 ${n}곡이 떠다녀요 · 눌러서 들어 보세요` : "아직 노래가 없어요. 첫 번째 노래를 만들어 주세요!"}</p>
      </div>
      <div className="cta"><button onClick={() => setPiano(true)}>🎹 내 노래 만들기</button></div>
      {toast && <div className="toast">{toast}</div>}
      {piano && <Piano code={code} onClose={() => setPiano(false)} onSaved={onSaved} />}
      {picked && <SongPlayer item={picked} onClose={() => setPicked(null)} />}
    </main>
  );
}

export function SongPlayer({ item, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(null);
  const stopRef = useRef(null);
  const inst = instOf(item.inst);
  const dur = item.dur || (item.notes.at(-1)?.t || 0) + 800;
  const play = () => {
    if (playing) { stopRef.current?.(); setPlaying(false); setCur(null); return; }
    setPlaying(true);
    stopRef.current = playSong(item.notes, item.inst, (nt) => setCur(nt.n));
    setTimeout(() => { setPlaying(false); setCur(null); }, dur + 600);
  };
  useEffect(() => () => stopRef.current?.(), []);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal player" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose}>✕</button>
        <div className="pl-inst">{inst.emoji}</div>
        <h2>{item.name || "이름 없는 친구"}의 노래</h2>
        <p className="sub">{inst.name} · {item.notes.length}음 · {Math.round(dur / 1000)}초 · {new Date(item.at).toLocaleDateString("ko-KR")}</p>
        <div className="pl-notes">
          {item.notes.slice(0, 40).map((nt, i) => (
            <span key={i} className={cur === nt.n && playing ? "on" : ""}>{NAME_OF[nt.n] || "♯"}</span>
          ))}
          {item.notes.length > 40 && <span>…</span>}
        </div>
        <button className={`pl-play${playing ? " on" : ""}`} onClick={play}>{playing ? "■" : "▶"}</button>
        <p className="note">{playing ? "재생 중이에요" : "눌러서 들어 보세요"}</p>
      </div>
    </div>
  );
}
