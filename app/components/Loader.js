"use client";

import { useEffect, useState } from "react";
import { loadSpace } from "../../lib/supabase";
import Lobby from "./Lobby";
import Play from "./Play";
import DrawGallery from "./DrawGallery";
import MusicGallery from "./MusicGallery";

export default function Loader({ code, view }) {
  const [space, setSpace] = useState(undefined); // undefined=읽는 중, null=없음
  useEffect(() => {
    let stop = false;
    loadSpace(code).then((s) => !stop && setSpace(s)).catch(() => !stop && setSpace(null));
    return () => { stop = true; };
  }, [code]);

  if (space === undefined)
    return <main className="page"><div className="card" style={{ textAlign: "center" }}>전시회를 여는 중이에요…</div></main>;
  if (!space)
    return (
      <main className="page">
        <div className="card">
          <h2>전시회를 찾지 못했어요</h2>
          <p className="sub">주소(코드 <b>{code}</b>)가 맞는지 확인해 주세요. 보관소가 잠시 쉬고 있을 때도 이렇게 나올 수 있어요. 잠시 뒤 새로고침해 보세요.</p>
          <a className="btn ghost" href="/" style={{ textDecoration: "none" }}>첫 화면으로</a>
        </div>
      </main>
    );
  if (view === "play") return <Play space={space} />;
  if (view === "draw") return <DrawGallery space={space} />;
  if (view === "music") return <MusicGallery space={space} />;
  return <Lobby space={space} />;
}
