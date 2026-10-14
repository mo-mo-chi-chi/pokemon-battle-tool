import { apiGet, type Resource } from './pokemonDetail';

export interface MoveDescriptionData {
  flavor_text_entries: { flavor_text: string; language: Resource; version_group: Resource }[];
  effect_entries: { short_effect: string; effect: string; language: Resource }[];
  effect_chance: number | null;
}

// 클릭하기 전에 불러온 응답도 이 캐시를 공유합니다. 같은 기술을 여러 번 요청하지 않습니다.
const resolved = new Map<string, MoveDescriptionData>();
const pending = new Map<string, Promise<MoveDescriptionData>>();

export function getCachedMoveDescription(slug: string): MoveDescriptionData | null {
  return resolved.get(slug) || null;
}

export function preloadMoveDescription(slug: string): Promise<MoveDescriptionData> {
  const ready = resolved.get(slug);
  if (ready) return Promise.resolve(ready);
  const ongoing = pending.get(slug);
  if (ongoing) return ongoing;
  const request = apiGet<MoveDescriptionData>(`move/${slug}`)
    .then(data => { resolved.set(slug, data); return data; })
    .finally(() => pending.delete(slug));
  pending.set(slug, request);
  return request;
}

// 선택된 버전에서 처음 보이는 기술만 백그라운드 프리패치합니다.
// 동시에 과도한 API 요청이 쏟아지지 않도록 최대 3개씩 제한합니다.
export function warmMoveDescriptions(slugs: string[]): () => void {
  const unique = [...new Set(slugs)].slice(0, 18);
  let cancelled = false;
  let index = 0;
  async function worker() {
    while (!cancelled && index < unique.length) {
      const slug = unique[index++];
      try { await preloadMoveDescription(slug); }
      catch { /* 모달을 열면 다시 시도할 수 있습니다. */ }
    }
  }
  // 데이터가 이미 로딩된 기술의 프리패치를 소량씩 시작합니다.
  void Promise.all([worker(), worker(), worker()]);
  return () => { cancelled = true; };
}
