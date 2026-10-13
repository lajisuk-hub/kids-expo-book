"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadItems } from "../../lib/supabase";
import Pano from "./Pano";
import TopBar, { Ticker } from "./TopBar";
import DrawPad from "./DrawPad";

export const MOODS = [
  { id: "happy", emoji: "😊", label: "기뻐요" },
  { id: "excited", emoji: "🤩", label: "신나요" },
  { id: "calm", emoji: "😌", label: "편안해요" },
  { id: "sleepy", emoji: "😴", label: "졸려요" },
  { id: "sad", emoji: "😢", label: "슬퍼요" },
  { id: "angry", emoji: "😠", label: "화나요" },
];
export const moodOf = (id) => MOODS.find((m) => m.id === id);

export function renderPic(it) {
  return (
    <span className="pic">
      <img src={it.img} alt={it.name ? `${it.name}의 기분 그림` : "기분 그림"} loading="lazy" draggable={false} />
      {it.mood && <i className="pic-mood">{moodOf(it.mood)?.emoji}</i>}
    </span>
  );
}
export function DrawViewer({ item, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal viewer" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose}>✕</button>
        <img className="viewer-img" src={item.img} alt="" />
        <div className="viewer-cap">
          {item.mood && <span className="mood-tag">{moodOf(item.mood)?.emoji} {moodOf(item.mood)?.label}</span>}
          <b>{item.name || "이름 없는 친구"}</b>
          <small>{new Date(item.at).toLocaleDateString("ko-KR")}</small>
        </div>
      </div>
    </div>
  );
}

export default function DrawGallery({ space }) {
  const { code, name } = space;
  const [items, setItems] = useState([]);
  const [pad, setPad] = useState(false);
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
    setItems((prev) => {
      const by = new Map(prev.map((r) => [r.id, r]));
      for (const r of rows) by.set(r.id, r);
      return [...by.values()];
    });
  }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try { const rows = await loadItems("d", code, since.current); if (!stop) merge(rows); } catch {}
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [code, merge]);

  const visible = useMemo(() => items.filter((i) => !i.hidden && i.img).sort((a, b) => (a.id < b.id ? -1 : 1)), [items]);
  const n = visible.length;
  const size = small ? (n > 30 ? 84 : 104) : n > 40 ? 110 : 150;

  const onSaved = (item) => {
    setPad(false);
    merge([item]);
    setMine(item.id);
    setTimeout(() => pano.current?.goTo(item.id), 80);
    setToast("내 그림이 전시장에 떠올랐어요! 🎉");
    setTimeout(() => setToast(""), 3500);
  };

  return (
    <main className="gallery draw-g">
      <TopBar code={code} org={name} title="그림 전시" color="#4d96ff" />
      <Ticker />
      <Pano
        ref={pano}
        startImg={1}
        paused={!!(pad || picked)}
        items={visible}
        size={size}
        mineId={mine}
        onPick={setPicked}
        render={renderPic}
      />
      <div className="g-title">
        <h1>오늘 나의 기분 그림 전시</h1>
        <p>{n > 0 ? `그림 ${n}장이 둥둥 떠다녀요 · 눌러서 크게 보세요` : "아직 그림이 없어요. 첫 번째 그림을 그려 주세요!"}</p>
      </div>
      <div className="cta"><button onClick={() => setPad(true)}>🖍️ 내 기분 그리기</button></div>
      {toast && <div className="toast">{toast}</div>}
      {pad && <DrawPad code={code} onClose={() => setPad(false)} onSaved={onSaved} />}
      {picked && <DrawViewer item={picked} onClose={() => setPicked(null)} />}
    </main>
  );
}
