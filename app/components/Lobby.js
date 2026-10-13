"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pano from "./Pano";
import { loadItems, addItem } from "../../lib/supabase";
import { groupReviews } from "../../lib/words";
import { renderBook, renderReview, BookViewer, ReviewForm, ReviewBubble, BookShelf, BOOK_COLOR } from "./Books";
import { renderPic, DrawViewer } from "./DrawGallery";
import { renderSong, SongPlayer } from "./MusicGallery";
import Guide from "./Guide";
import { Ticker } from "./TopBar";

// 동화책(로비에서 바로 보는 전시) + 체험관 3개: 아래 탭 단추 (작품이 많아져도 묻히지 않게 파노라마 위에는 띄우지 않는다)
export const CHAPTERS = [
  { id: "book", title: "동화책 전시", en: "BOOK", emoji: "📚", color: BOOK_COLOR, desc: "동화책 보고 소감 남겨요", here: true },
  { id: "play", title: "체험 전시", en: "PLAY", emoji: "🤸", color: "#ff6b6b", desc: "화면 속 사람을 따라 몸을 움직여요" },
  { id: "draw", title: "그림 전시", en: "DRAW", emoji: "🎨", color: "#4d96ff", desc: "오늘 내 기분을 얼굴로 그려요" },
  { id: "music", title: "음악 전시", en: "MUSIC", emoji: "🎵", color: "#6bcb77", desc: "나만의 노래를 30초 녹음해요" },
];

export default function Lobby({ space }) {
  const { code, name } = space;
  const pano = useRef(null);
  const [draws, setDraws] = useState([]);
  const [songs, setSongs] = useState([]);
  const [books, setBooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [shelf, setShelf] = useState(false);
  const [mine, setMine] = useState(null);
  const [picked, setPicked] = useState(null); // {kind, item}
  const [guide, setGuide] = useState(false);
  const [small, setSmall] = useState(false);
  const sinceD = useRef(null), sinceM = useRef(null), sinceB = useRef(null), sinceR = useRef(null);

  // 사용법 팝업: 이 브라우저에서 처음 열 때 한 번 (❓ 단추로 다시)
  useEffect(() => {
    try { const k = `eb-guide-${code}`; if (!sessionStorage.getItem(k)) { setGuide(true); sessionStorage.setItem(k, "1"); } } catch { setGuide(true); }
  }, [code]);
  useEffect(() => {
    const on = () => setSmall(window.innerWidth < 700);
    on(); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on);
  }, []);

  // 그림 전시·음악 전시에 올라온 작품을 로비에도 띄운다 (처음 전부, 그 뒤 새 것만 8초마다)
  const merge = useCallback((setter, sinceRef) => (rows) => {
    if (!rows.length) return;
    for (const r of rows) if (!sinceRef.current || r.at > sinceRef.current) sinceRef.current = r.at;
    setter((prev) => { const by = new Map(prev.map((r) => [r.id, r])); for (const r of rows) by.set(r.id, r); return [...by.values()]; });
  }, []);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const [d, m, b, r] = await Promise.all([
          loadItems("d", code, sinceD.current), loadItems("m", code, sinceM.current),
          loadItems("b", code, sinceB.current), loadItems("r", code, sinceR.current),
        ]);
        if (stop) return;
        merge(setDraws, sinceD)(d); merge(setSongs, sinceM)(m); merge(setBooks, sinceB)(b); merge(setReviews, sinceR)(r);
      } catch {}
    };
    tick(); const id = setInterval(tick, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [code, merge]);

  const nWorks = draws.length + songs.length + books.length + Math.min(40, reviews.length);
  const size = small ? (nWorks > 30 ? 72 : 88) : nWorks > 40 ? 96 : 120;
  const shownBooks = useMemo(() => books.filter((b) => !b.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1)), [books]);
  const groups = useMemo(() => groupReviews(reviews.filter((r) => !r.hidden && r.text)), [reviews]);
  const bookOf = (id) => books.find((b) => b.id === id);
  const counts = useMemo(() => { const c = {}; for (const r of reviews) if (!r.hidden && r.bookId) c[r.bookId] = (c[r.bookId] || 0) + 1; return c; }, [reviews]);
  const items = useMemo(() => [
    ...shownBooks.map((b) => ({ ...b, kind: "b", w: Math.round(size * 1.05), h: Math.round(size * 1.45) })),
    ...groups.slice(0, 40).map((g) => ({ ...g, id: `rv-${g.key}`, kind: "r", auto: true })),
    ...draws.filter((i) => !i.hidden && i.img).map((i) => ({ ...i, kind: "d" })),
    ...songs.filter((i) => !i.hidden && Array.isArray(i.notes) && i.notes.length).map((i) => ({ ...i, kind: "m" })),
  ], [draws, songs, shownBooks, groups, size]);
  const works = items.length;

  const onPick = (p) => setPicked({ kind: p.kind, item: p });
  const go = (c) => { if (c.here) return setShelf(true); window.location.href = `/e/${code}/${c.id}`; };
  const openBook = (b) => { setShelf(false); setPicked({ kind: "b", item: b }); };
  // 소감 저장 → 바로 로비에 떠오르게 (다른 사람 화면엔 8초 안에)
  const addReview = async (text, bookId) => {
    const r = await addItem("r", code, { text, bookId: bookId || "" });
    setReviews((prev) => [...prev, r]);
    const id = `rv-${groupReviews([r])[0]?.key}`;
    setMine(id);
    setTimeout(() => pano.current?.goTo(id), 300); // 내가 남긴 소감 쪽으로 화면을 옮겨 보여 준다
    setTimeout(() => setMine(null), 6000);
  };

  return (
    <main className="lobby-pano">
      <Pano
        ref={pano}
        startImg={1}
        items={items}
        size={size}
        speed={30}
        paused={!!picked || guide || shelf}
        mineId={mine}
        onPick={onPick}
        render={(p) => (p.kind === "d" ? renderPic(p) : p.kind === "m" ? renderSong(p) : p.kind === "b" ? renderBook(p) : renderReview(p))}
      />
      <header className="top">
        <span className="org">{name}</span>
        <h1>온라인 전시회</h1>
        <p>떠다니는 동화책을 눌러 읽고 소감을 남겨 주세요 · 아래 단추로 체험관에 들어가요</p>
      </header>
      {works > 0 && <div className="count">작품 {works}개가 떠 있어요</div>}
      <nav className="chtabs">
        {CHAPTERS.map((c) => (
          <button key={c.id} style={{ "--c": c.color }} onClick={() => go(c)}>
            <span className="tab-emoji">{c.emoji}</span>
            <b>{c.title}</b>
            <small>{c.desc}</small>
          </button>
        ))}
      </nav>
      <button className="helplink" onClick={() => setGuide(true)}>❓ 사용법</button>
      <a className="adminlink" href={`/e/${code}/admin`}>기관 관리</a>
      <Ticker />
      {guide && <Guide org={name} onClose={() => setGuide(false)} />}
      {picked?.kind === "d" && <DrawViewer item={picked.item} onClose={() => setPicked(null)} />}
      {picked?.kind === "m" && <SongPlayer item={picked.item} onClose={() => setPicked(null)} />}
      {picked?.kind === "b" && (
        <BookViewer book={picked.item} onClose={(want) => setPicked(want ? { kind: "rf", item: picked.item } : null)} />
      )}
      {picked?.kind === "rf" && (
        <ReviewForm
          book={picked.item}
          popular={groups.slice(0, 4).map((g) => g.text)}
          onCancel={() => setPicked(null)}
          onSubmit={async (t) => { await addReview(t, picked.item.id); setPicked(null); }}
        />
      )}
      {picked?.kind === "r" && (
        <ReviewBubble
          group={picked.item}
          book={bookOf(picked.item.bookId)}
          onSame={() => addReview(picked.item.text, picked.item.bookId)}
          onOpenBook={() => openBook(bookOf(picked.item.bookId))}
          onClose={() => setPicked(null)}
        />
      )}
      {shelf && <BookShelf books={shownBooks} counts={counts} onOpen={openBook} onClose={() => setShelf(false)} />}
    </main>
  );
}
