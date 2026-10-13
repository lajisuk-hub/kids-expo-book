import { createClient } from "@supabase/supabase-js";

// 수성구·한글날 전시관과 같은 Supabase 프로젝트·같은 표·같은 버킷을 씁니다. (publishable key는 공개용)
const SUPABASE_URL = "https://pgywpdodatjfpivxmymn.supabase.co";
const SUPABASE_KEY = "sb_publishable_FeO3LdfFBB6KEwblcZPa2w_sW9dVuUg";

// 표 하나(id, data, updated_at)에 줄 이름으로 구분한다. 기관마다 코드(6자리)가 달라 섞이지 않는다.
//  - eb-space-<코드>            : 기관(어린이집 이름·관리 비밀번호·체험 영상 주소)
//  - eb-d-<코드>-<시각>-<난수>  : 그림 한 장 (name, cls, img, hidden)
//  - eb-m-<코드>-<시각>-<난수>  : 노래 한 곡 (name, inst, notes[], dur, hidden)
//  - eb-b-<코드>-<시각>-<난수>  : 동화책 한 권 (title, by, pages[], cover, spread, hidden)
//  - eb-r-<코드>-<시각>-<난수>  : 동화책 소감 한 마디 (text, bookId, name, hidden)
// (원래 온라인 전시회 kids-expo는 ex- 로 시작 — 같은 표를 쓰지만 서로 섞이지 않는다)
export const TABLE = "suseong_hub_content";
export const BUCKET = "suseong-hub";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 체험 전시 기본 영상(「따라 해 보세요」 워밍업). 관리 화면에서 기관별로 바꿀 수 있다.
export const OUR_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/expo/warmup-v6.mp4`; // 우리가 만든 「따라 해 보세요」
export const HUG_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/expo/hug-ending-v2.mp4`; // 유튜브 영상이 끝나면 이어지는 「안아주기」 마무리(16초)
export const DEFAULT_VIDEO = OUR_VIDEO; // 기본: 우리가 만든 「따라 해 보세요」(안아주기 마무리 포함)

const spaceId = (code) => `eb-space-${code}`;
const prefix = (kind, code) => `eb-${kind}-${code}-`;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function makeCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── 기관 ─────────────────────────────────────────
export async function loadSpace(code) {
  const { data, error } = await supabase.from(TABLE).select("data,updated_at").eq("id", spaceId(code)).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { code, ...data.data } : null;
}
export async function createSpace({ name, pin }) {
  for (let tries = 0; tries < 5; tries++) {
    const code = makeCode();
    if (await loadSpace(code)) continue;
    const pinHash = await sha256(pin);
    const data = { name, pinHash, createdAt: new Date().toISOString() };
    const { error } = await supabase.from(TABLE).insert({ id: spaceId(code), data });
    if (error) throw new Error(error.message);
    return code;
  }
  throw new Error("코드를 만들지 못했어요. 다시 시도해 주세요.");
}
export async function saveSpace(code, data) {
  const { error } = await supabase.from(TABLE).update({ data, updated_at: new Date().toISOString() }).eq("id", spaceId(code));
  if (error) throw new Error(error.message);
}

// ── 작품(그림 d / 노래 m) ─────────────────────────
const toItem = (row) => ({ id: row.id, ...(row.data || {}), hidden: !!row.data?.hidden, at: row.updated_at });

// since 이후에 생기거나 바뀐 것만. PostgREST는 1000줄씩만 주므로 끝까지 나눠 읽는다.
export async function loadItems(kind, code, since) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(TABLE).select("id,data,updated_at").like("id", `${prefix(kind, code)}%`).order("updated_at", { ascending: true }).range(from, from + 999);
    if (since) q = q.gt("updated_at", since);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all.map(toItem);
}
export async function addItem(kind, code, data) {
  const id = `${prefix(kind, code)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from(TABLE).insert({ id, data: { ...data, hidden: false } });
  if (error) throw new Error(error.message);
  return { id, ...data, hidden: false, at: new Date().toISOString() };
}
export async function setItemHidden(item, hidden) {
  const { id, at, ...data } = item;
  const { error } = await supabase.from(TABLE).update({ data: { ...data, hidden }, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

// 책 제목 고치기 등 내용 바꾸기
export async function updateItem(item, patch) {
  const { id, at, ...data } = item;
  const next = { ...data, ...patch };
  const { error } = await supabase.from(TABLE).update({ data: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ...item, ...patch };
}

// ── 동화책 쪽 그림 올리기 (같은 이름 덮어쓰기가 안 되므로 올릴 때마다 새 폴더) ──
export async function uploadBookPage(code, folder, index, blob) {
  const name = `expo-book/${code}/book/${folder}/p${String(index + 1).padStart(3, "0")}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(name, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
}

// ── 그림 파일 올리기 ──────────────────────────────
export async function uploadImage(code, blob) {
  const name = `expo-book/${code}/draw/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(name, blob, { contentType: "image/png", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
}
