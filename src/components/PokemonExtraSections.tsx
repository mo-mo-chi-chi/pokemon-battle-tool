import { useEffect, useMemo, useState } from 'react';
import { apiGet, getId, type PokemonApi, type Resource } from '../data/pokemonDetail';
import {
  getAreaName, versionLabel, versionOrder, HELD_ITEM_GAME_GROUPS,
  type PokemonEncounter,
} from '../data/pokemonExtras';

type Props = { pokemon: PokemonApi; itemNames: Map<number, string> };
type HeldEntry = { item: Resource; chance: number };
interface ItemApi {
  sprites?: { default?: string | null };
  names?: { name: string; language: Resource }[];
}
const itemDetailsCache = new Map<string, Promise<ItemApi | null>>();
function itemDetails(item: Resource): Promise<ItemApi | null> {
  if (!itemDetailsCache.has(item.url)) {
    itemDetailsCache.set(item.url, apiGet<ItemApi>(item.url).catch(() => null));
  }
  return itemDetailsCache.get(item.url)!;
}

// 임의 제작 SVG나 아무 도구 그림으로 대체하지 않습니다.
// PokéAPI 도구 리소스가 지정한 실제 게임 아이콘만 표시합니다.
function HeldItemRow({ item, chance, itemNames }: HeldEntry & { itemNames: Map<number, string> }) {
  const [details, setDetails] = useState<ItemApi | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setDetails(null);
    setImageFailed(false);
    void itemDetails(item).then(data => { if (active) setDetails(data); });
    return () => { active = false; };
  }, [item.url]);
  const id = getId(item);
  const korean = details?.names?.find(n => n.language.name === 'ko')?.name;
  const name = korean || (id !== null ? itemNames.get(id) : null) ||
    (['leek', 'stick'].includes(item.name) ? '대파' : '도구 이름 정보 없음');
  const sprite = details?.sprites?.default;
  return <div className="dex-item-row">
    {sprite && !imageFailed && <span className="dex-held-icon"><img
      src={sprite} alt="" loading="lazy" onError={() => setImageFailed(true)}
    /></span>}
    <div className="dex-item-text"><strong>{name}</strong><span>소지 확률 {chance}%</span></div>
  </div>;
}

export function HeldItems({ pokemon, itemNames }: Props) {
  const available = useMemo(() => {
    const byVersion = new Map<string, Map<string, HeldEntry>>();
    for (const entry of pokemon.held_items || []) {
      for (const v of entry.version_details || []) {
        const chance = Number(v.rarity);
        if (!Number.isFinite(chance) || chance <= 0) continue;
        const version = v.version.name;
        if (!byVersion.has(version)) byVersion.set(version, new Map());
        const records = byVersion.get(version)!;
        const before = records.get(entry.item.name);
        if (!before || before.chance < chance) records.set(entry.item.name, { item: entry.item, chance });
      }
    }
    return byVersion;
  }, [pokemon.held_items]);

  const versions = useMemo(() => [...available.keys()]
    .filter(v => Boolean(available.get(v)?.size)).sort(versionOrder), [available]);
  const [selectedVersion, setSelectedVersion] = useState('');
  useEffect(() => { setSelectedVersion(''); }, [pokemon.id]);

  // 소지 기록이 없는 포켓몬은 패널 전체를 숨깁니다. 자료가 없는 버전도 선택창에 넣지 않습니다.
  if (!versions.length) return null;

  const current = versions.includes(selectedVersion) ? selectedVersion : versions[versions.length - 1];
  const items = [...(available.get(current)?.values() || [])].sort((a,b) => a.item.name.localeCompare(b.item.name));
  return <section className="detail2-card dex-held-card" aria-label="야생 포켓몬의 지닌 도구">
    <div className="detail2-card-head"><h2>야생 포켓몬의 지닌 도구</h2><span className="detail2-count">{items.length}종</span></div>
    <label className="dex-extra-label">게임 버전
      <select value={current} onChange={e => setSelectedVersion(e.target.value)}>
        {HELD_ITEM_GAME_GROUPS.map(group => {
          const groupVersions = versions.filter(v => (group.versions as readonly string[]).includes(v));
          return groupVersions.length ? <optgroup key={group.label} label={group.label}>
            {groupVersions.map(v => <option key={v} value={v}>{versionLabel(v)}</option>)}
          </optgroup> : null;
        })}
        {versions.some(v => !HELD_ITEM_GAME_GROUPS.some(g => (g.versions as readonly string[]).includes(v))) &&
          <optgroup label="기타 게임">
            {versions.filter(v => !HELD_ITEM_GAME_GROUPS.some(g => (g.versions as readonly string[]).includes(v)))
              .map(v => <option key={v} value={v}>{versionLabel(v)}</option>)}
          </optgroup>}
      </select>
    </label>
    <div className="dex-item-list" key={`${pokemon.id}-${current}`}>
      {items.map(entry => <HeldItemRow key={entry.item.url} {...entry} itemNames={itemNames} />)}
    </div>
    <p className="detail2-footnote">소지 도구 정보가 등록된 게임만 표시합니다. 아이콘은 게임 원본 자료가 제공된 경우에만 표시합니다.</p>
  </section>;
}

function EncounterRow({ area }: { area: Resource }) {
  const [name, setName] = useState('지명 확인 중…');
  useEffect(() => {
    let alive = true;
    setName('지명 확인 중…');
    getAreaName(area).then(value => { if (alive) setName(value); });
    return () => { alive = false; };
  }, [area.url]);
  return <span>{name}</span>;
}
export function EncounterLocations({ pokemon }: { pokemon: PokemonApi }) {
  const [entries, setEntries] = useState<PokemonEncounter[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [limit, setLimit] = useState(12);
  useEffect(() => {
    const controller = new AbortController();
    setEntries(null); setError(''); setSelected(''); setLimit(12);
    if (!pokemon.location_area_encounters) { setEntries([]); return; }
    apiGet<PokemonEncounter[]>(pokemon.location_area_encounters, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setEntries(rows); })
      .catch(() => { if (!controller.signal.aborted) setError('등장 장소 정보를 불러오지 못했습니다.'); });
    return () => controller.abort();
  }, [pokemon.id, pokemon.location_area_encounters]);
  const versions = useMemo(() => [...new Set((entries || []).flatMap(item => item.version_details.map(v => v.version.name)))].sort(versionOrder), [entries]);
  const current = versions.includes(selected) ? selected : versions[0] || '';
  const rows = useMemo(() => (entries || []).flatMap(item => item.version_details
    .filter(v => v.version.name === current)
    .map(v => ({ key: item.location_area.url, area:item.location_area,
      min: v.encounter_details.length ? Math.min(...v.encounter_details.map(e=>e.min_level)) : null,
      max: v.encounter_details.length ? Math.max(...v.encounter_details.map(e=>e.max_level)) : null,
      chance:v.max_chance,
    }))).sort((a,b) => a.area.name.localeCompare(b.area.name)), [entries, current]);
  return <section className="detail2-card">
    <div className="detail2-card-head"><h2>등장 장소</h2>{Boolean(rows.length) && <span className="detail2-count">{rows.length}곳</span>}</div>
    {error ? <p className="detail2-muted">{error}</p> : entries === null ? <p className="detail2-muted">출현 장소를 조회하는 중입니다…</p> : !entries.length ? <p className="detail2-muted">PokéAPI에 등록된 야생 출현 장소가 없습니다. 이벤트·교환·선물 등 별도 획득 방식은 포함되지 않습니다.</p> : <>
      <label className="dex-extra-label">게임 버전 (오래된 세대순)
        <select value={current} onChange={e => { setSelected(e.target.value); setLimit(12); }}>
          {HELD_ITEM_GAME_GROUPS.map(group => {
            const options = versions.filter(v => (group.versions as readonly string[]).includes(v));
            return options.length ? <optgroup key={group.label} label={group.label}>
              {options.map(v => <option key={v} value={v}>{versionLabel(v)}</option>)}
            </optgroup> : null;
          })}
          {versions.some(v => !HELD_ITEM_GAME_GROUPS.some(g => (g.versions as readonly string[]).includes(v))) &&
            <optgroup label="기타 게임">
              {versions.filter(v => !HELD_ITEM_GAME_GROUPS.some(g => (g.versions as readonly string[]).includes(v)))
                .map(v => <option key={v} value={v}>{versionLabel(v)}</option>)}
            </optgroup>}
        </select>
      </label>
      <div className="dex-encounter-list">{rows.slice(0, limit).map(row => <div className="dex-encounter-row" key={row.key}>
        <strong><EncounterRow area={row.area}/></strong>
        <small>{row.min === null ? '레벨 정보 없음' : `Lv.${row.min}${row.max !== row.min ? `~${row.max}` : ''}`} · 최대 출현율 {row.chance}%</small>
      </div>)}</div>
      {!rows.length && <p className="detail2-muted">해당 버전의 등장 장소 데이터가 없습니다.</p>}
      {rows.length > limit && <button className="dex-more" type="button" onClick={() => setLimit(v => v + 12)}>장소 더보기 ({rows.length - limit}곳 남음)</button>}
      <p className="detail2-footnote">등록된 야생 출현 기록만 표시합니다. 출현율은 최대 기록이며 조우 조건·시간·날씨에 따라 실제 값이 달라질 수 있습니다.</p>
    </>}
  </section>;
}
