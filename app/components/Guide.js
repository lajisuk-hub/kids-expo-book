"use client";

// 학부모용 사용법 팝업: 동화책 + 전시 3개가 무엇인지 + 어떤 단추를 누르면 되는지
const ITEMS = [
  {
    emoji: "📚", color: "#845ec2", title: "동화책 전시 (로비)",
    what: "우리 어린이집 동화책이 로비에 둥둥 떠다녀요. 책을 누르면 크게 열려 한 장씩 넘겨 볼 수 있고, 다 보면 소감 한마디를 남겨요. 남긴 소감도 로비에 함께 떠다녀요.",
    how: ["떠다니는 책 표지(또는 아래 「📚 동화책 전시」 단추) 누르기 → 좌우로 넘기기", "「다 봤어요! 소감 남기기」 → 「전시장에 띄우기」 · 떠 있는 소감을 누르면 「♥ 나도 같은 마음」"],
  },
  {
    emoji: "🤸", color: "#ff6b6b", title: "체험 전시",
    what: "화면 속 사람이 보여 주는 동작을 온 가족이 따라 하는 영상이에요. 마지막엔 옆 사람을 꼭 안아 줘요.",
    how: ["「▶ 크게 보며 따라 하기」를 누르면 전체 화면으로 재생돼요", "TV에 연결하면 더 좋아요"],
  },
  {
    emoji: "🎨", color: "#4d96ff", title: "그림 전시",
    what: "얼굴 밑그림 위에 오늘 내 기분을 그려요. 얼굴이 아니어도 괜찮아요, 아무거나 자유롭게 그려도 돼요! 다 그리면 전시장에 둥둥 떠다니고, 다른 친구들도 볼 수 있어요.",
    how: ["「🖍️ 내 기분 그리기」 → 색·굵기 고르고 손가락으로 그리기", "「✅ 다 그렸어요!」 → 「🎉 네, 전시해요!」 (다시 그릴 수도 있어요)"],
  },
  {
    emoji: "🎵", color: "#6bcb77", title: "음악 전시",
    what: "피아노·실로폰·오르골 건반을 눌러 30초 노래를 만들어요. 전시장에 악기 모양으로 떠다니고, 누르면 들려요.",
    how: ["「🎹 내 노래 만들기」 → 악기 고르기 → 「● 녹음 시작」 → 건반 치기", "「■ 녹음 끝」 → 「▶ 들어 보기」 → 「🎉 네, 전시해요!」"],
  },
];

export default function Guide({ org, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal guide" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="닫기">✕</button>
        <div className="guide-head">
          <span className="org">{org}</span>
          <h2>온라인 전시회에 오신 걸 환영해요 🎪</h2>
          <p className="sub">로비에서는 동화책을 보고 소감을 남기고, 아래 단추로 체험·그림·음악 전시에 들어가요. 그림·노래·소감은 모두 로비에 함께 떠다녀요.</p>
        </div>
        <ol className="guide-list">
          {ITEMS.map((it) => (
            <li key={it.title} style={{ "--c": it.color }}>
              <div className="g-ic">{it.emoji}</div>
              <div>
                <b>{it.title}</b>
                <p>{it.what}</p>
                <ul>{it.how.map((h) => <li key={h}>{h}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
        <div className="guide-tips">
          <span>👆 화면을 좌우로 밀면 전시장을 둘러볼 수 있어요</span>
          <span>❓ 이 설명은 오른쪽 위 「사용법」 단추로 다시 볼 수 있어요</span>
        </div>
        <button className="btn big" onClick={onClose}>시작할게요!</button>
      </div>
    </div>
  );
}
