"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { loadSpace, saveSpace, loadItems, setItemHidden, sha256, DEFAULT_VIDEO, OUR_VIDEO, addItem, updateItem, uploadBookPage } from "../../lib/supabase";
import { INSTRUMENTS, playSong } from "../../lib/synth";
import { moodOf } from "./DrawGallery";

// 동화책 파일(PDF 한 개, 또는 쪽 그림 여러 장)을 쪽마다 JPG로 바꿔 보관소에 올린다.
async function toJpeg(canvas) { return new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.86)); }
async function filesToPages(code, files, onProgress) {
  const folder = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const urls = []; let ratio = 0.75;
  const pdf = files.find((f) => /pdf$/i.test(f.type) || /[.]pdf$/i.test(f.name));
  if (pdf) {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise;
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress(`${i} / ${doc.numPages}쪽 올리는 중…`);
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      if (i === 2 || doc.numPages === 1) ratio = base.width / base.height;
      const vp = page.getViewport({ scale: 1400 / Math.max(base.width, base.height) });
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise; // print: 탭이 가려져도 안 멈춤
      urls.push(await uploadBookPage(code, folder, i - 1, await toJpeg(c)));
    }
  } else {
    const imgs = files.filter((f) => /^image[/]/.test(f.type)).sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
    for (let i = 0; i < imgs.length; i++) {
      onProgress(`${i + 1} / ${imgs.length}장 올리는 중…`);
      const bmp = await createImageBitmap(imgs[i]);
      const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      if (i === Math.min(1, imgs.length - 1)) ratio = bmp.width / bmp.height;
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
      urls.push(await uploadBookPage(code, folder, i, await toJpeg(c)));
    }
  }
  // 쪽 그림 한 장이 이미 두 쪽 펼침(가로가 훨씬 긴 것)이면 넘겨 볼 때 한 장씩
  return { urls, spread: ratio > 1.3 };
}

export default function Admin({ code }) {
  const [space, setSpace] = useState(undefined);
  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [draws, setDraws] = useState([]);
  const [songs, setSongs] = useState([]);
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [name, setName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [books, setBooks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bTitle, setBTitle] = useState("");
  const [bBy, setBBy] = useState("");
  const [bFiles, setBFiles] = useState([]);
  const [bMsg, setBMsg] = useState("");
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    loadSpace(code).then((s) => {
      setSpace(s);
      if (s) {
        setName(s.name); setVideoUrl(s.videoUrl || "");
        try { if (sessionStorage.getItem(`eb-admin-${code}`) === s.pinHash) setOk(true); } catch {}
      }
    }).catch(() => setSpace(null));
  }, [code]);
  useEffect(() => {
    if (!ok) return;
    QRCode.toDataURL(`${origin}/e/${code}`, { width: 400, margin: 1, color: { dark: "#3a2d2a" } }).then(setQr).catch(() => {});
    refresh();
  }, [ok, origin, code]);

  const refresh = async () => {
    try {
      const [d, m, b, r] = await Promise.all([loadItems("d", code), loadItems("m", code), loadItems("b", code), loadItems("r", code)]);
      setBooks(b.sort((x, y) => (x.order ?? 0) - (y.order ?? 0) || (x.id < y.id ? -1 : 1)));
      setReviews(r.sort((x, y) => (x.id < y.id ? 1 : -1)));
      setDraws(d.sort((a, b) => (a.id < b.id ? 1 : -1)));
      setSongs(m.sort((a, b) => (a.id < b.id ? 1 : -1)));
    } catch (e) { setMsg("목록을 못 불러왔어요: " + (e.message || e)); }
  };
  const login = async () => {
    setErr("");
    const h = await sha256(pin);
    if (h !== space.pinHash) return setErr("비밀번호가 달라요.");
    try { sessionStorage.setItem(`eb-admin-${code}`, h); } catch {}
    setOk(true);
  };
  const saveInfo = async () => {
    if (!name.trim()) return setMsg("어린이집 이름을 확인해 주세요.");
    setBusy(true);
    try {
      const data = { ...space, name: name.trim().slice(0, 40), videoUrl: videoUrl.trim() };
      delete data.code;
      await saveSpace(code, data);
      setSpace({ code, ...data });
      setMsg("저장했어요. 전시회를 새로고침하면 반영돼요.");
    } catch (e) { setMsg("저장 실패: " + (e.message || e)); } finally { setBusy(false); }
  };
  const toggle = async (kind, it) => {
    try {
      await setItemHidden(it, !it.hidden);
      const upd = (list) => list.map((x) => (x.id === it.id ? { ...x, hidden: !it.hidden } : x));
      if (kind === "d") setDraws(upd); else if (kind === "b") setBooks(upd); else if (kind === "r") setReviews(upd); else setSongs(upd);
    } catch (e) { setMsg("바꾸지 못했어요: " + (e.message || e)); }
  };
  const addBook = async () => {
    if (!bTitle.trim()) return setBMsg("책 제목을 적어 주세요.");
    if (!bFiles.length) return setBMsg("PDF 파일(또는 쪽 그림)을 골라 주세요.");
    setBusy(true); setBMsg("파일을 읽는 중…");
    try {
      const { urls, spread } = await filesToPages(code, bFiles, setBMsg);
      if (!urls.length) throw new Error("쪽을 하나도 못 읽었어요. PDF나 JPG·PNG 그림인지 확인해 주세요.");
      const order = books.length ? Math.max(...books.map((b) => b.order ?? 0)) + 1 : 0;
      const b = await addItem("b", code, { title: bTitle.trim().slice(0, 40), by: bBy.trim().slice(0, 40), pages: urls, cover: urls[0], spread, order });
      setBooks((prev) => [...prev, b]);
      setBTitle(""); setBBy(""); setBFiles([]); setFileKey((k) => k + 1);
      setBMsg(`『${b.title}』 ${urls.length}쪽을 전시했어요 ✅ 로비에 바로 떠다녀요.`);
    } catch (e) { setBMsg("올리지 못했어요: " + (e.message || e)); } finally { setBusy(false); }
  };
  const editBook = async (b, patch) => {
    try { const nb = await updateItem(b, patch); setBooks((prev) => prev.map((x) => (x.id === b.id ? nb : x))); setMsg("바꿨어요."); }
    catch (e) { setMsg("바꾸지 못했어요: " + (e.message || e)); }
  };
  const moveBook = async (i, d) => {
    const j = i + d; if (j < 0 || j >= books.length) return;
    const next = [...books]; [next[i], next[j]] = [next[j], next[i]];
    setBooks(next.map((b, k) => ({ ...b, order: k })));
    try { await Promise.all(next.map((b, k) => (b.order === k ? null : updateItem(b, { order: k })))); } catch (e) { setMsg("순서를 저장하지 못했어요: " + (e.message || e)); }
  };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); setMsg("주소를 복사했어요."); } catch { prompt("복사하세요", t); } };

  if (space === undefined) return <main className="page"><div className="card">여는 중…</div></main>;
  if (!space) return <main className="page"><div className="card"><h2>전시회를 찾지 못했어요</h2><a className="btn ghost" href="/">첫 화면으로</a></div></main>;
  if (!ok)
    return (
      <main className="page">
        <div className="card">
          <h2>🔐 {space.name} 전시회 관리</h2>
          <p className="sub">전시회를 만들 때 정한 관리 비밀번호를 넣어 주세요.</p>
          <input className="inp" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="비밀번호" />
          {err && <div className="err">{err}</div>}
          <div style={{ height: 12 }} />
          <button className="btn" onClick={login}>들어가기</button>
        </div>
      </main>
    );

  const links = [
    ["학부모 링크 (전시회 로비)", `${origin}/e/${code}`],
    ["체험 전시 바로가기", `${origin}/e/${code}/play`],
    ["그림 전시 바로가기", `${origin}/e/${code}/draw`],
    ["음악 전시 바로가기", `${origin}/e/${code}/music`],
    ["기관 수정 링크 (이 화면)", `${origin}/e/${code}/admin`],
  ];
  return (
    <main className="page">
      <div className="hero"><h1>{space.name} 전시회 관리</h1><p>전시회 코드 <b>{code}</b></p></div>
      {msg && <div className="toast" onClick={() => setMsg("")}>{msg}</div>}

      <div className="card">
        <h2>1. 주소와 QR</h2>
        {qr && <img className="qrbig" src={qr} alt="학부모 입장 QR" />}
        <p className="sub" style={{ textAlign: "center" }}>QR을 길게 눌러(또는 오른쪽 클릭) 저장해 안내문에 넣으세요.</p>
        {links.map(([label, url]) => (
          <div className="linkbox" key={url}>
            <b>{label}</b><code>{url}</code>
            <div className="row">
              <button className="btn sm" onClick={() => copy(url)}>주소 복사</button>
              <a className="btn sm ghost" href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>열어 보기</a>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>2. 어린이집 이름 · 체험 영상</h2>
        <label className="f">어린이집 이름</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <label className="f">체험 전시 영상 주소 (비워 두면 기본 영상)</label>
        <input className="inp" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={DEFAULT_VIDEO} />
        <p className="sub" style={{ marginTop: 6 }}>유튜브 주소(youtu.be/… 또는 watch?v=…)나 mp4 파일 주소를 넣으면 우리 원만의 체험 영상으로 바뀌어요. 직접 만든 「따라 해 보세요」 영상 주소: <code style={{ fontSize: 11, wordBreak: "break-all" }}>{OUR_VIDEO}</code></p>
        <button className="btn" onClick={saveInfo} disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
      </div>

      <div className="card">
        <h2>3. 동화책 전시 ({books.filter((b) => !b.hidden).length}권 전시 중)</h2>
        <p className="sub">동화책 PDF 파일을 올리면 쪽마다 그림으로 바뀌어 로비에 떠다녀요. 학부모님이 눌러 넘겨 보고 소감을 남길 수 있어요. (PDF가 없으면 쪽 사진 JPG·PNG 여러 장을 한꺼번에 골라도 돼요 — 파일 이름 순서대로 넘어가요)</p>
        <label className="f">책 제목</label>
        <input className="inp" value={bTitle} onChange={(e) => setBTitle(e.target.value)} maxLength={40} placeholder="예) 우리 반 가을 소풍" />
        <label className="f">만든 반 · 지은이 (선택)</label>
        <input className="inp" value={bBy} onChange={(e) => setBBy(e.target.value)} maxLength={40} placeholder="예) 햇님반 친구들" />
        <label className="f">동화책 파일</label>
        <input key={fileKey} className="inp" type="file" accept="application/pdf,.pdf,image/*" multiple onChange={(e) => setBFiles([...e.target.files])} />
        {bFiles.length > 0 && <p className="sub" style={{ marginTop: 4 }}>고른 파일: {bFiles.length === 1 ? bFiles[0].name : `${bFiles.length}개`}</p>}
        {bMsg && <div className="sub" style={{ color: "#5a3fb5", fontWeight: 700 }}>{bMsg}</div>}
        <button className="btn" onClick={addBook} disabled={busy} style={{ marginTop: 8 }}>{busy ? "올리는 중… (창을 닫지 마세요)" : "📚 동화책 전시하기"}</button>
        <div className="thumbs" style={{ marginTop: 14 }}>
          {books.map((b, i) => (
            <div key={b.id} className={`thumb${b.hidden ? " hidden-row" : ""}`}>
              {b.cover && <img src={b.cover} alt="" loading="lazy" style={{ objectFit: "contain", background: "#f4efe6" }} />}
              <div className="thumb-cap"><b>{b.title}</b><small>{(b.pages || []).length}쪽 · 소감 {reviews.filter((r) => r.bookId === b.id && !r.hidden).length}</small></div>
              <div className="row">
                <button className="btn sm ghost" onClick={() => moveBook(i, -1)} disabled={i === 0}>◀</button>
                <button className="btn sm ghost" onClick={() => moveBook(i, 1)} disabled={i === books.length - 1}>▶</button>
              </div>
              <button className="btn sm ghost" onClick={() => { const t = prompt("책 제목", b.title); if (t && t.trim()) editBook(b, { title: t.trim().slice(0, 40) }); }}>제목 고치기</button>
              <button className="btn sm ghost" onClick={() => toggle("b", b)}>{b.hidden ? "되살리기" : "숨기기"}</button>
            </div>
          ))}
          {!books.length && <p className="sub">아직 동화책이 없어요.</p>}
        </div>
      </div>

      <div className="card">
        <h2>4. 동화책 소감 ({reviews.filter((r) => !r.hidden).length}개 표시 중 / 전체 {reviews.length}개)</h2>
        <p className="sub">잘못 올라온 소감은 「숨기기」로 로비에서 빼요.</p>
        <table className="list">
          <thead><tr><th>소감</th><th>책</th><th>날짜</th><th></th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className={r.hidden ? "hidden-row" : ""}>
                <td><b>{r.text}</b></td>
                <td>{books.find((b) => b.id === r.bookId)?.title || "-"}</td>
                <td>{new Date(r.at).toLocaleDateString("ko-KR")}</td>
                <td><button className="btn sm ghost" onClick={() => toggle("r", r)}>{r.hidden ? "되살리기" : "숨기기"}</button></td>
              </tr>
            ))}
            {!reviews.length && <tr><td colSpan={4} className="sub">아직 소감이 없어요.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>5. 그림 전시 ({draws.filter((d) => !d.hidden).length}장 표시 중 / 전체 {draws.length}장)</h2>
        <p className="sub">잘못 올라온 그림은 「숨기기」로 전시장에서 빼요. 언제든 되살릴 수 있어요.</p>
        <div className="row" style={{ marginBottom: 8 }}><button className="btn sm ghost" onClick={refresh}>새로고침</button></div>
        <div className="thumbs">
          {draws.map((d) => (
            <div key={d.id} className={`thumb${d.hidden ? " hidden-row" : ""}`}>
              <img src={d.img} alt="" loading="lazy" />
              <div className="thumb-cap"><b>{d.name || "이름 없음"}</b> {d.mood && <span>{moodOf(d.mood)?.emoji}</span>}<small>{new Date(d.at).toLocaleDateString("ko-KR")}</small></div>
              <button className="btn sm ghost" onClick={() => toggle("d", d)}>{d.hidden ? "되살리기" : "숨기기"}</button>
            </div>
          ))}
          {!draws.length && <p className="sub">아직 그림이 없어요.</p>}
        </div>
      </div>

      <div className="card">
        <h2>6. 음악 전시 ({songs.filter((s) => !s.hidden).length}곡 표시 중 / 전체 {songs.length}곡)</h2>
        <table className="list">
          <thead><tr><th>이름</th><th>악기</th><th>길이</th><th></th><th></th></tr></thead>
          <tbody>
            {songs.map((s) => {
              const inst = INSTRUMENTS.find((i) => i.id === s.inst) || INSTRUMENTS[0];
              return (
                <tr key={s.id} className={s.hidden ? "hidden-row" : ""}>
                  <td><b>{s.name || "이름 없음"}</b></td>
                  <td>{inst.emoji} {inst.name}</td>
                  <td>{Math.round((s.dur || 0) / 1000)}초</td>
                  <td><button className="btn sm ghost" onClick={() => playSong(s.notes || [], s.inst)}>▶ 듣기</button></td>
                  <td><button className="btn sm ghost" onClick={() => toggle("m", s)}>{s.hidden ? "되살리기" : "숨기기"}</button></td>
                </tr>
              );
            })}
            {!songs.length && <tr><td colSpan={5} className="sub">아직 노래가 없어요.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
