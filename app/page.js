"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createSpace } from "../lib/supabase";

export default function Home() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const [goCode, setGoCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState("");
  const [video, setVideo] = useState(false); // 사용법 영상 팝업

  useEffect(() => setOrigin(window.location.origin), []);
  // 사용법 영상: 이 브라우저에서 처음 열 때 자동으로 한 번 (단추로 언제든 다시)
  useEffect(() => {
    try { if (!sessionStorage.getItem("eb-home-video")) { setVideo(true); sessionStorage.setItem("eb-home-video", "1"); } } catch { setVideo(true); }
  }, []);
  useEffect(() => {
    if (!made) return;
    QRCode.toDataURL(`${origin}/e/${made.code}`, { width: 400, margin: 1, color: { dark: "#3a2d2a" } }).then(setQr).catch(() => {});
  }, [made, origin]);

  const create = async () => {
    setErr("");
    if (!name.trim()) return setErr("어린이집 이름을 적어 주세요.");
    if (!/^\d{4,8}$/.test(pin)) return setErr("관리 비밀번호는 숫자 4~8자리로 정해 주세요.");
    setBusy(true);
    try {
      const code = await createSpace({ name: name.trim().slice(0, 40), pin });
      setMade({ code });
    } catch (e) {
      setErr("전시회를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요. (" + (e.message || e) + ")");
    } finally {
      setBusy(false);
    }
  };
  const copy = async (label, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000); }
    catch { prompt("아래 주소를 길게 눌러 복사하세요", text); }
  };
  const summary = made
    ? [
        `🎪 ${name.trim() || "우리 어린이집"} 온라인 전시회`,
        ``,
        `① 학부모 링크 (카톡·QR로 보내는 주소)`,
        `${origin}/e/${made.code}`,
        ``,
        `② 기관 수정 링크 (비밀번호 필요 · 학부모께 보내지 마세요)`,
        `${origin}/e/${made.code}/admin`,
        ``,
        `전시회 코드: ${made.code}`,
        `관리 비밀번호: (만들 때 정한 숫자)`,
      ].join(String.fromCharCode(10))
    : "";
  const go = () => {
    const c = goCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (c.length < 6) return;
    window.location.href = `/e/${c}`;
  };

  return (
    <main className="page">
      <div className="logos">
        <img src="/logo-childcare.png" alt="수성구육아종합지원센터" />
      </div>
      <div className="hero">
        <div className="hero-ic">🎪</div>
        <h1>우리 어린이집 온라인 전시회</h1>
        <div className="notice">
          <b>수성구육아종합지원센터</b>가 제작하여<br />관내 어린이집에 배부하는 온라인 전시회 자료입니다.
        </div>
        <p>동화책 전시 · 체험 전시 · 그림 전시 · 음악 전시, 네 가지 전시를 휴대폰으로 즐겨요. 로비에서는 우리 원 동화책을 보고 소감을 남기고, 체험관의 그림·노래도 로비에 함께 전시돼요. 어린이집마다 따로 전시회를 만들어 쓰기 때문에 다른 곳과 섞이지 않아요.</p>
        <button className="btn video-btn" onClick={() => setVideo(true)}>📺 사용법 영상 보기 <small>1분 38초 · 만들기부터 학부모 배부까지</small></button>
      </div>

      {made ? (
        <div className="card">
          <h2>🎉 우리 어린이집 전시회가 열렸어요</h2>
          <p className="sub">아래 주소 2개를 꼭 저장해 두세요. 특히 <b>기관 관리 주소</b>는 이 화면을 닫으면 다시 볼 수 없어요.</p>
          {qr && <img className="qrbig" src={qr} alt="학부모 입장 QR" />}
          <LinkBox label="① 학부모 링크 (카톡·QR로 보내는 주소)" url={`${origin}/e/${made.code}`} copy={copy} copied={copied} />
          <LinkBox label="② 기관 수정 링크 (비밀번호 필요 · 이름 수정, 작품 숨기기)" url={`${origin}/e/${made.code}/admin`} copy={copy} copied={copied} />
          <div className="warn">전시회 코드는 <b>{made.code}</b> 예요. 주소를 잃어버려도 이 첫 화면에서 코드를 넣으면 들어갈 수 있어요.</div>
          <div className="allcopy">
            <b>📋 한 번에 저장하기</b>
            <p>아래 글을 통째로 복사해서 <u>지금 내 카톡(나에게 보내기)</u>에 붙여 두세요. 학부모께 보낼 땐 학부모 링크 줄만 보내면 돼요.</p>
            <pre>{summary}</pre>
            <button className="btn big" onClick={() => copy("all", summary)}>{copied === "all" ? "복사됐어요 ✓  이제 카톡에 붙여 넣으세요" : "📋 전체 복사하기"}</button>
          </div>
          <div style={{ height: 12 }} />
          <a className="btn" href={`/e/${made.code}`} style={{ textDecoration: "none" }}>전시회 열어 보기 →</a>
        </div>
      ) : (
        <div className="card">
          <h2>새 전시회 만들기 (기관용)</h2>
          <p className="sub">원장님·선생님이 한 번만 만들면 됩니다. 만들고 나면 학부모께 보낼 주소가 나와요.</p>
          <label className="f">어린이집 이름</label>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 해오라기어린이집" maxLength={40} />
          <label className="f">관리 비밀번호 (숫자 4~8자리)</label>
          <input className="inp" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="예: 1234" inputMode="numeric" maxLength={8} />
          {err && <div className="err">{err}</div>}
          <div style={{ height: 14 }} />
          <button className="btn" onClick={create} disabled={busy}>{busy ? "만드는 중…" : "전시회 만들기"}</button>
        </div>
      )}

      <div className="card">
        <h2>이미 만든 전시회 열기</h2>
        <p className="sub">전시회 코드(6글자)를 아시면 여기에 넣으세요.</p>
        <div className="row">
          <input className="inp" value={goCode} onChange={(e) => setGoCode(e.target.value)} placeholder="예: bpyp6c" maxLength={6} onKeyDown={(e) => e.key === "Enter" && go()} />
          <button className="btn" style={{ width: 110 }} onClick={go} disabled={goCode.trim().length < 6}>열기</button>
        </div>
      </div>

      {video && (
        <div className="modal-bg" onClick={() => setVideo(false)}>
          <div className="modal vmodal" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setVideo(false)} aria-label="닫기">✕</button>
            <h2>📺 사용법 영상</h2>
            <p className="sub">전시회 만들기 → 주소 2개 저장 → 학부모께 배부, 1분 38초예요.</p>
            <video className="vmodal-video" src="https://pgywpdodatjfpivxmymn.supabase.co/storage/v1/object/public/suseong-hub/expo/guide-v2.mp4" controls autoPlay playsInline />
            <button className="btn" onClick={() => setVideo(false)} style={{ marginTop: 12 }}>닫고 전시회 만들기</button>
          </div>
        </div>
      )}

      <div className="card soft">
        <h2>전시회에는 이런 게 있어요</h2>
        <ul className="feat">
          <li><span>🤸</span><div><b>체험 전시</b><br />화면 속 사람을 따라 몸을 움직이는 「따라 해 보세요」 영상</div></li>
          <li><span>🎨</span><div><b>그림 전시</b><br />오늘 내 기분을 얼굴 그림으로 그리면 전시장에 둥둥 떠다녀요</div></li>
          <li><span>🎵</span><div><b>음악 전시</b><br />피아노·실로폰·오르골로 30초 노래를 만들어 전시해요</div></li>
        </ul>
      </div>
      <footer className="home-foot">
        <img src="/logo-childcare.png" alt="수성구육아종합지원센터" />
        <span>본 자료는 수성구육아종합지원센터가 제작하여 배포하였습니다.</span>
      </footer>
    </main>
  );
}

function LinkBox({ label, url, copy, copied }) {
  return (
    <div className="linkbox">
      <b>{label}</b>
      <code>{url}</code>
      <div className="row">
        <button className="btn sm" onClick={() => copy(label, url)}>{copied === label ? "복사됐어요 ✓" : "주소 복사"}</button>
        <a className="btn sm ghost" href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>열어 보기</a>
      </div>
    </div>
  );
}
