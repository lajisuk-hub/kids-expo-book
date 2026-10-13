"use client";

// 각 전시 화면 위쪽: 어린이집 이름 · 전시 이름 · 로비로 돌아가기
export default function TopBar({ code, org, title, color = "#ff6b6b", right = null }) {
  return (
    <div className="topbar" style={{ "--c": color }}>
      <a className="tb-back" href={`/e/${code}`} aria-label="전시회 로비로">← 로비</a>
      <div className="tb-mid">
        <span className="tb-org">{org}</span>
        <b className="tb-title">{title}</b>
      </div>
      <div className="tb-right">{right}</div>
    </div>
  );
}

// 전시장 맨 아래 옆으로 흐르는 작은 안내 글
export function Ticker() {
  const t = "수성구육아종합지원센터에서 제작하여 배포하였습니다  ·  ";
  return (
    <div className="ticker" aria-hidden="true"><div className="ticker-in"><span>{t}{t}{t}{t}</span></div></div>
  );
}
