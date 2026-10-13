"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_VIDEO, HUG_VIDEO } from "../../lib/supabase";
import TopBar, { Ticker } from "./TopBar";

// 유튜브 주소(youtu.be/ID, watch?v=ID, embed/ID, shorts/ID)에서 ID 뽑기
export function youtubeId(url = "") {
  const m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// 유튜브 IFrame API 한 번만 불러오기
let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((res) => {
    if (window.YT && window.YT.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  });
  return ytReady;
}

export default function Play({ space }) {
  const { code, name, videoUrl } = space;
  const src = videoUrl || DEFAULT_VIDEO;
  const yt = youtubeId(src);
  const box = useRef(null);      // 전체 화면으로 키울 틀
  const holder = useRef(null);   // 유튜브 플레이어 자리
  const player = useRef(null);
  const hugRef = useRef(null);
  const mainRef = useRef(null);  // mp4 영상
  const [phase, setPhase] = useState("video"); // video → hug(마무리) → done

  // 유튜브: 영상이 끝나면 우리 「안아주기」 마무리를 이어서 튼다
  useEffect(() => {
    if (!yt) return;
    let dead = false;
    loadYT().then((YT) => {
      if (dead || !holder.current) return;
      player.current = new YT.Player(holder.current, {
        videoId: yt,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: { onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) setPhase("hug"); } },
      });
    });
    return () => { dead = true; try { player.current?.destroy(); } catch {} };
  }, [yt]);
  useEffect(() => {
    if (phase === "hug" && hugRef.current) { hugRef.current.currentTime = 0; hugRef.current.play().catch(() => {}); }
  }, [phase]);

  const full = () => {
    const b = box.current; if (!b) return;
    if (b.requestFullscreen) b.requestFullscreen().catch(() => {});
    else if (hugRef.current?.webkitEnterFullscreen) hugRef.current.webkitEnterFullscreen();
  };
  const startAll = () => { if (yt) player.current?.playVideo?.(); else mainRef.current?.play(); full(); };
  const replay = () => { setPhase("video"); if (yt) { player.current?.seekTo?.(0); player.current?.playVideo?.(); } else if (mainRef.current) { mainRef.current.currentTime = 0; mainRef.current.play().catch(() => {}); } };

  return (
    <main className="play">
      <TopBar code={code} org={name} title="체험 전시" color="#ff6b6b" />
      <Ticker />
      <div className="play-wrap">
        <div className="play-card">
          <h2>따라 해 보세요 <small>FOLLOW THE MOTION</small></h2>
          <p>화면 속 사람처럼 몸을 움직여 보세요. 손 흔들기부터 마지막 <b>안아주기</b>까지 11가지 동작, 1분 39초예요.{yt && " 영상이 끝나면 안아주기가 이어져요."}</p>
          <div ref={box} className={`play-box${phase !== "video" ? " hugging" : ""}`}>
            {yt ? <div className="yt-wrap"><div ref={holder} /></div> : <video ref={mainRef} className="play-video" src={src} controls playsInline preload="metadata" poster="/ch-play.jpg" onEnded={() => setPhase("done")} />}
            <video
              ref={hugRef}
              className="play-video hug-video"
              src={HUG_VIDEO}
              playsInline
              preload="auto"
              controls={false}
              onEnded={() => setPhase("done")}
            />
            {phase === "done" && (
              <div className="play-done">
                <b>오늘도 참 잘했어요 ♥</b>
                <button className="btn sm" onClick={replay}>↻ 처음부터 다시</button>
              </div>
            )}
          </div>
          <div className="play-btns">
            <button className="btn" onClick={startAll}>⛶ 크게 보며 따라 하기</button>
          </div>
          <ul className="play-tips">
            <li>📺 TV나 큰 화면에 연결하면 온 가족이 함께할 수 있어요.</li>
            <li>🔊 소리를 켜면 박자가 들려요. 박자에 맞춰 움직여 보세요.</li>
            <li>🤗 영상이 끝나면 옆에 있는 사람을 꼭 안아 주세요.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
