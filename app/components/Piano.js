"use client";

import { useEffect, useRef, useState } from "react";
import { addItem } from "../../lib/supabase";
import { INSTRUMENTS, WHITE, BLACK, playNote, playSong, audio } from "../../lib/synth";
import { MELODIES } from "../../lib/melodies";

const MAX_MS = 30000;

export default function Piano({ code, onClose, onSaved }) {
  const [inst, setInst] = useState("piano");
  const [melody, setMelody] = useState("free");
  const [step, setStep] = useState(0);
  const [rec, setRec] = useState(null); // {start, notes}
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(null); // {notes, dur}
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lit, setLit] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const recRef = useRef(null);
  recRef.current = rec;

  const song = MELODIES.find((m) => m.id === melody) || MELODIES[0];
  const next = song.notes.length ? song.notes[step % song.notes.length] : null;

  // 녹음 시간 표시 + 30초 자동 종료
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      const ms = performance.now() - rec.start;
      setElapsed(ms);
      if (ms >= MAX_MS) stop();
    }, 100);
    return () => clearInterval(id);
  }, [rec]);

  const press = (n) => {
    audio();
    playNote(n, inst);
    setLit(n); setTimeout(() => setLit((v) => (v === n ? null : v)), 180);
    const r = recRef.current;
    if (r) r.notes.push({ n, t: Math.round(performance.now() - r.start) });
    if (next != null && n === next) setStep((s) => s + 1);
  };
  const start = () => { audio(); setDone(null); setErr(""); setStep(0); setRec({ start: performance.now(), notes: [] }); };
  const stop = () => {
    const r = recRef.current; if (!r) return;
    const dur = Math.min(MAX_MS, Math.round(performance.now() - r.start));
    setRec(null); setElapsed(0);
    if (!r.notes.length) return setErr("아무 건반도 안 눌렀어요. 녹음을 켜고 건반을 눌러 보세요!");
    setDone({ notes: r.notes, dur: Math.max(dur, (r.notes.at(-1)?.t || 0) + 600) });
  };
  const preview = () => {
    if (!done || previewing) return;
    setPreviewing(true);
    playSong(done.notes, inst, (nt) => { setLit(nt.n); setTimeout(() => setLit((v) => (v === nt.n ? null : v)), 180); });
    setTimeout(() => setPreviewing(false), done.dur + 500);
  };
  const save = async () => {
    if (!done) return;
    setBusy(true); setErr("");
    try {
      const item = await addItem("m", code, { name: name.trim().slice(0, 20), inst, notes: done.notes.slice(0, 400), dur: done.dur, melody });
      onSaved(item);
    } catch (e) {
      setErr("전시하지 못했어요. 잠시 뒤 다시 시도해 주세요. (" + (e.message || e) + ")");
    } finally { setBusy(false); }
  };

  const sec = (ms) => (ms / 1000).toFixed(1);

  return (
    <div className="modal-bg">
      <div className="modal piano-m">
        <button className="x" onClick={onClose}>✕</button>
        <h2>내가 만든 노래 전시</h2>
        <p className="sub">악기를 고르고 「녹음」을 누른 뒤 건반을 쳐요. 최대 30초, 다 치면 「녹음 끝」!</p>

        <div className="chips">
          {INSTRUMENTS.map((i) => (
            <button key={i.id} className={`chip${inst === i.id ? " on" : ""}`} style={{ "--c": "#6bcb77" }} onClick={() => { setInst(i.id); playNote(67, i.id); }}>{i.emoji} {i.name}</button>
          ))}
        </div>
        <label className="f">따라 치기 도움 (다음에 누를 건반이 반짝여요)</label>
        <select className="inp" value={melody} onChange={(e) => { setMelody(e.target.value); setStep(0); }}>
          {MELODIES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <div className="kbd">
          {WHITE.map((w, i) => (
            <button
              key={`${w.n}-${i}`}
              className={`wk${lit === w.n ? " lit" : ""}${next === w.n ? " next" : ""}`}
              style={{ "--c": w.color }}
              onPointerDown={(e) => { e.preventDefault(); press(w.n); }}
            >
              <span>{w.label}</span>
            </button>
          ))}
          {BLACK.map((b) => (
            <button
              key={b.n}
              className={`bk${lit === b.n ? " lit" : ""}`}
              style={{ left: `calc(${(b.after + 1) * 12.5}% - 4.2%)` }}
              onPointerDown={(e) => { e.preventDefault(); press(b.n); }}
            />
          ))}
        </div>

        <div className="rec-row">
          {rec ? (
            <>
              <div className="rec-time on">● 녹음 중 {sec(elapsed)}초 <small>/ 30초</small></div>
              <button className="btn" onClick={stop}>■ 녹음 끝</button>
            </>
          ) : (
            <>
              <div className="rec-time">{done ? `녹음 완료 · ${done.notes.length}음 · ${sec(done.dur)}초` : "아직 녹음 전이에요"}</div>
              <button className="btn rec-btn" onClick={start}>● {done ? "다시 녹음" : "녹음 시작"}</button>
            </>
          )}
        </div>
        <div className="bar"><i style={{ width: `${Math.min(100, (elapsed / MAX_MS) * 100)}%` }} /></div>

        {err && !done && <div className="err">{err}</div>}
      </div>
      {done && (
        <div className="modal-bg ask-bg">
          <div className="modal ask">
            <h2>이 노래를 전시할까요?</h2>
            <p className="sub">{INSTRUMENTS.find((i) => i.id === inst)?.emoji} {INSTRUMENTS.find((i) => i.id === inst)?.name} · {done.notes.length}음 · {sec(done.dur)}초. 전시하면 전시장에 떠다니고 다른 친구들도 눌러서 들을 수 있어요.</p>
            <div className="ask-notes">
              {done.notes.slice(0, 32).map((nt, i) => <span key={i} className={lit === nt.n && previewing ? "on" : ""}>{WHITE.find((w) => w.n === nt.n)?.label || "♯"}</span>)}
              {done.notes.length > 32 && <span>…</span>}
            </div>
            <button className="btn ghost" onClick={preview} disabled={previewing}>{previewing ? "재생 중…" : "▶ 들어 보기"}</button>
            <label className="f">이름 (안 적어도 돼요)</label>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 하늘" maxLength={20} />
            {err && <div className="err">{err}</div>}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={() => { setDone(null); setErr(""); }} disabled={busy}>🎹 다시 녹음</button>
              <button className="btn" onClick={save} disabled={busy}>{busy ? "전시하는 중…" : "🎉 네, 전시해요!"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
