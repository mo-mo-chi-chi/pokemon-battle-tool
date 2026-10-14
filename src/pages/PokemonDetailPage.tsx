import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PokemonSearch from '../components/PokemonSearch';
import OfficialIcon from '../components/OfficialIcon';
import MoveDetailModal from '../components/MoveDetailModal';
import { preloadMoveDescription, warmMoveDescriptions } from '../data/moveDescriptions';
import { EncounterLocations, HeldItems } from '../components/PokemonExtraSections';
import { formGroup, formLabel, imageCandidates } from '../data/pokemonExtras';
import { getFallbackSpriteUrl, getSpriteUrl, TYPE_INFO, type PokemonEntry } from '../data/pokemon';
import {
  apiGet, getAbilityNames, getEvolutionDictionary, getId, getMoveInfo, localizedName,
  genderLabel, evolutionLabel, EGG_GROUPS, GROWTH, METHODS, DAMAGE_CLASS,
  versionGroups,
  type ChainLink, type EvolutionApi, type EvolutionDictionary, type MoveInfo,
  type PokemonApi, type SpeciesApi,
} from '../data/pokemonDetail';

interface Props { pokemonIndex: PokemonEntry[]; loading: boolean; searchError?: string }
const STATS = [
  ['hp', 'HP'], ['attack', '공격'], ['defense', '방어'],
  ['special-attack', '특수공격'], ['special-defense', '특수방어'], ['speed', '스피드'],
] as const;
const MAX_STAT = 255;
const TICKS = [50, 100, 150, 200, 250];
const METHODS_FILTER = ['all', 'level-up', 'machine', 'egg', 'tutor', 'other'];

function Sprite({ id, size = 'normal' }: { id: number; size?: 'normal' | 'small' }) {
  const [src, setSrc] = useState(() => getSpriteUrl(id));
  useEffect(() => setSrc(getSpriteUrl(id)), [id]);
  return (
    <img
      className={`detail2-sprite ${size === 'small' ? 'detail2-sprite--small' : ''}`}
      src={src}
      alt={`전국도감 ${id}번`}
      draggable={false}
      loading="lazy"
      onError={() => {
        if (src !== getFallbackSpriteUrl(id)) setSrc(getFallbackSpriteUrl(id));
      }}
    />
  );
}
function VariantSprite({ pokemon, shiny, label }: { pokemon: PokemonApi; shiny: boolean; label: string }) {
  const images = useMemo(() => imageCandidates(pokemon, shiny), [pokemon, shiny]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [pokemon.id, shiny]);
  const src = images[index];
  if (!src) return <div className="dex-sprite-missing">{shiny ? '색이 다른 모습 이미지 미제공' : '현재 폼의 이미지 미제공'}</div>;
  return <img key={`${pokemon.id}-${shiny}-${index}`} className="detail2-sprite" src={src} alt={`${label}${shiny ? ' 색이 다른 모습' : ''}`} draggable={false} onError={() => setIndex(i => i + 1)} />;
}
function FormPicker({ species, baseSlug, chosen, onChoose }: {
  species: SpeciesApi; baseSlug: string; chosen: string; onChoose: (slug:string)=>void;
}) {
  if (species.varieties.length <= 1) return null;
  const sorted = [...species.varieties].sort((a,b) => Number(b.is_default) - Number(a.is_default));
  return <section className="detail2-card dex-forms-card">
    <div className="detail2-card-head"><h2>다른 모습 · 메가진화 · 리전폼</h2><span className="detail2-caption">{sorted.length}종</span></div>
    <div className="dex-form-options">{sorted.map(v => {
      const group = formGroup(baseSlug, v.pokemon.name, v.is_default);
      return <button key={v.pokemon.name} type="button" className={`dex-form-btn ${chosen === v.pokemon.name ? 'selected' : ''}`} onClick={() => onChoose(v.pokemon.name)}>
        <span className="dex-form-group">{group}</span>
        <strong>{formLabel(baseSlug, v.pokemon.name, v.is_default)}</strong>
      </button>;
    })}</div>
    <p className="detail2-footnote">폼을 선택하면 해당 모습의 이미지·타입·특성·종족값·기술표를 불러옵니다. 포켓몬에 따라 일부 게임에서는 사용할 수 없습니다.</p>
  </section>;
}
function TypePill({ id }: { id: number }) {
  const type = TYPE_INFO[id];
  if (!type) return <span className="detail2-muted">—</span>;
  return (
    <span className="detail2-type" style={{ color: type.color, borderColor: `${type.color}66` }}>
      <OfficialIcon path={type.icon} className="type-icon" /> {type.label}
    </span>
  );
}
function StatCard({ pokemon }: { pokemon: PokemonApi }) {
  const total = STATS.reduce((acc, [stat]) => acc + (pokemon.stats.find((s) => s.stat.name === stat)?.base_stat || 0), 0);
  return (
    <section className="detail2-card">
      <div className="detail2-card-head"><h2>기본 종족값</h2><span className="detail2-caption">합계 {total} / 최대 눈금 255</span></div>
      <div className="detail2-axis" aria-hidden="true">
        <div className="detail2-axis-content">
          {[0, 50, 100, 150, 200, 255].map((n) => (
            <span key={n} className={n === 0 ? 'first' : n === 255 ? 'last' : ''} style={{ left: `${n / MAX_STAT * 100}%` }}>{n}</span>
          ))}
        </div>
      </div>
      {STATS.map(([key, label]) => {
        const value = pokemon.stats.find((s) => s.stat.name === key)?.base_stat || 0;
        return (
          <div className="detail2-stat-row" key={key}>
            <span>{label}</span><strong>{value}</strong>
            <div className="detail2-track" role="meter" aria-label={`${label} 종족값`} aria-valuemin={0} aria-valuemax={255} aria-valuenow={Math.min(255, value)}>
              <div className="detail2-fill" style={{ width: `${Math.min(100, value / MAX_STAT * 100)}%` }} />
              {TICKS.map((tick) => <i key={tick} style={{ left: `${tick / MAX_STAT * 100}%` }} />)}
            </div>
          </div>
        );
      })}
      <p className="detail2-footnote">종족값 기준입니다. 실전 능력치는 레벨·성격·SP 등에 따라 달라집니다.</p>
    </section>
  );
}
function EvolutionNode({ node, current, index, dictionary, depth = 0 }: {
  node: ChainLink; current: number; index: Map<number, PokemonEntry>; dictionary: EvolutionDictionary | null; depth?: number;
}) {
  const id = getId(node.species);
  const entry = id === null ? undefined : index.get(id);
  const name = entry?.name || '이름 정보 없음';
  return (
    <div className="detail2-evo-tree">
      <div className="detail2-evo-stage">
        {depth > 0 && <div className="detail2-evo-trigger" title={evolutionLabel(node.evolution_details, dictionary)}>
          <span aria-hidden="true">→</span> {evolutionLabel(node.evolution_details, dictionary)}
        </div>}
        {id && id <= 1025 ? (
          <Link to={`/pokemon/${id}`} className={`detail2-evo-pokemon ${current === id ? 'current' : ''}`}>
            <Sprite id={id} size="small" /><span>{name}</span><small>#{String(id).padStart(4, '0')}</small>
          </Link>
        ) : <div className="detail2-evo-pokemon"><span>{name}</span></div>}
      </div>
      {node.evolves_to.length > 0 && (
        <div className="detail2-evo-children">
          {node.evolves_to.map((child) => (
            <EvolutionNode key={child.species.name} node={child} current={current} index={index} dictionary={dictionary} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// 소드·실드(8세대) 실제 게임 기술 분류 이미지 사용 (물리·특수·변화)
function DamageClassIcon({ damageClass }: { damageClass: number }) {
  const kind = damageClass === 2 ? 'physical' : damageClass === 3 ? 'special' : 'status';
  const label = DAMAGE_CLASS[damageClass] || '변화';
  return (
    <span className={`detail2-damage-class detail2-damage-class--${kind}`} title={label}>
      <OfficialIcon path={`seals/gen8/move-${kind}.png`} className="detail2-damage-icon" />
      <span>{label}</span>
    </span>
  );
}

function MoveCard({ pokemon, moveDex, loading, error }: {
  pokemon: PokemonApi; moveDex: Map<string, MoveInfo> | null;
  loading: boolean; error: string;
}) {
  // 기술을 실제 습득하는 게임 버전만 선택지로 제공
  const availableVersions = useMemo(() => {
    const present = new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((v) => v.version_group.name)));
    return versionGroups.filter((v) => present.has(v.id));
  }, [pokemon]);
  const availableGens = [...new Set(availableVersions.map((v) => v.gen))];
  const [chosenGen, setChosenGen] = useState<number | null>(null);
  const [chosenVersion, setChosenVersion] = useState('');
  const [chosenMethod, setChosenMethod] = useState('all');
  const [moveQuery, setMoveQuery] = useState('');
  const [openedMove, setOpenedMove] = useState<{ slug: string; name: string; info?: MoveInfo } | null>(null);
  const currentGen = chosenGen !== null && availableGens.includes(chosenGen) ? chosenGen : (availableGens.at(-1) || 9);
  const versionOptions = availableVersions.filter((v) => v.gen === currentGen);
  const currentVersion = versionOptions.some((v) => v.id === chosenVersion) ? chosenVersion : (versionOptions.at(-1)?.id || '');

  const moves = useMemo(() => {
    const matches: {
      key: string; name: string; method: string; level: number; info?: MoveInfo;
    }[] = [];
    for (const move of pokemon.moves) {
      for (const v of move.version_group_details) {
        if (v.version_group.name !== currentVersion) continue;
        const method = v.move_learn_method.name;
        if (chosenMethod !== 'all' && (chosenMethod === 'other' ? ['level-up', 'machine', 'egg', 'tutor'].includes(method) : chosenMethod !== method)) continue;
        const info = moveDex?.get(move.move.name);
        const name = info?.name || '기술명 확인 중';
        if (moveQuery.trim() && !name.toLocaleLowerCase().includes(moveQuery.trim().toLocaleLowerCase())) continue;
        const key = `${move.move.name}/${method}/${v.level_learned_at}`;
        if (!matches.some((m) => m.key === key)) {
          matches.push({ key, name, method, level: v.level_learned_at, info });
        }
      }
    }
    const order: Record<string, number> = { 'level-up':0, machine:1, egg:2, tutor:3 };
    return matches.sort((a, b) =>
      (order[a.method] ?? 4) - (order[b.method] ?? 4) ||
      (a.method === 'level-up' ? a.level - b.level : 0) || a.name.localeCompare(b.name, 'ko')
    );
  }, [pokemon, currentVersion, chosenMethod, moveQuery, moveDex]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all:0, 'level-up':0, machine:0, egg:0, tutor:0, other:0 };
    for (const move of pokemon.moves) {
      for (const v of move.version_group_details) {
        if (v.version_group.name !== currentVersion) continue;
        result.all++;
        if (result[v.move_learn_method.name] !== undefined) result[v.move_learn_method.name]++;
        else result.other++;
      }
    }
    return result;
  }, [pokemon, currentVersion]);

  // 현재 표시된 기술 중 앞쪽 18개를 미리 받아두어 첫 클릭 지연을 줄입니다.
  useEffect(() => {
    if (!moveDex || !moves.length) return;
    return warmMoveDescriptions(moves.map(({ key }) => key.split('/')[0]));
  }, [moves, moveDex]);

  return (
    <section className="detail2-card detail2-moves" aria-label="세대별 배우는 기술">
      <div className="detail2-card-head">
        <div><h2>배우는 기술</h2><p className="detail2-subtitle">세대 및 게임 버전별 습득 기술</p></div>
        <span className="detail2-count">{moves.length}개</span>
      </div>
      <div className="detail2-select-row">
        <label>세대
          <select value={currentGen} onChange={(event) => { setChosenGen(Number(event.target.value)); setChosenVersion(''); setChosenMethod('all'); }}>
            {availableGens.map((g) => <option key={g} value={g}>{g}세대</option>)}
          </select>
        </label>
        <label>게임 버전
          <select value={currentVersion} onChange={(event) => { setChosenVersion(event.target.value); setChosenMethod('all'); }}>
            {versionOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <div className="detail2-methods" aria-label="기술 습득 방법 필터">
        {METHODS_FILTER.map((method) => (
          <button key={method} type="button" className={chosenMethod === method ? 'selected' : ''} onClick={() => setChosenMethod(method)}>
            {method === 'all' ? '전체' : method === 'other' ? '기타' : METHODS[method]} <span>{counts[method] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="detail2-move-search-wrap">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={moveQuery} onChange={(event) => setMoveQuery(event.target.value)} placeholder="기술 이름 검색" aria-label="기술 검색" />
      </div>
      {loading && <p className="detail2-muted detail2-move-status">한국어 기술명을 불러오는 중입니다…</p>}
      {error && <p className="detail2-muted detail2-move-status">한국어 기술명 로딩 실패: 영어 이름으로 표시합니다.</p>}
      <div className="detail2-table-scroll">
        <table className="detail2-table">
          <thead><tr><th>습득</th><th>기술명</th><th>타입</th><th>분류</th><th>위력</th><th>명중</th><th>PP</th></tr></thead>
          <tbody>
            {moves.map(({ key, name, method, level, info }) => (
              <tr key={key}>
                <td className="detail2-method-cell">
                  {method === 'level-up' ? <><span className="detail2-level">Lv.{level}</span><small>레벨업</small></> : <span>{METHODS[method] || '기타 습득'}</span>}
                </td>
                <td className="detail2-move-name"><button type="button" className="dex-move-open" onPointerEnter={() => { void preloadMoveDescription(key.split('/')[0]).catch(() => {}); }} onFocus={() => { void preloadMoveDescription(key.split('/')[0]).catch(() => {}); }} onTouchStart={() => { void preloadMoveDescription(key.split('/')[0]).catch(() => {}); }} onClick={() => setOpenedMove({slug:key.split('/')[0],name,info})} title={`${name} 기술 정보 보기`}>{name}<span aria-hidden="true"> ↗</span></button></td>
                <td>{info?.typeId ? <TypePill id={info.typeId} /> : '—'}</td>
                <td>{info ? <DamageClassIcon damageClass={info.damageClass} /> : '—'}</td>
                <td>{info?.power ?? '—'}</td>
                <td>{info?.accuracy == null ? '—' : `${info.accuracy}%`}</td>
                <td>{info?.pp ?? '—'}</td>
              </tr>
            ))}
            {!moves.length && <tr><td colSpan={7} className="detail2-no-moves">해당 조건의 기술이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="detail2-footnote">기술명을 클릭하면 상세 설명이 표시됩니다. PokéAPI의 게임 버전별 습득 데이터이며 Pokémon Champions 전용 기술표와는 다를 수 있습니다.</p>
      {openedMove && <MoveDetailModal move={openedMove} version={currentVersion} onClose={() => setOpenedMove(null)} />}
    </section>
  );
}

export default function PokemonDetailPage({ pokemonIndex, loading, searchError = '' }: Props) {
  const { id } = useParams();
  const number = Number(id);
  const valid = Number.isInteger(number) && number >= 1 && number <= 1025;
  const pokemon = pokemonIndex.find((p) => p.id === number);
  const [data, setData] = useState<PokemonApi | null>(null);
  const [selectedForm, setSelectedForm] = useState('');
  const [formData, setFormData] = useState<PokemonApi | null>(null);
  const [formError, setFormError] = useState('');
  const [shiny, setShiny] = useState(false);
  const [species, setSpecies] = useState<SpeciesApi | null>(null);
  const [chain, setChain] = useState<ChainLink | null>(null);
  const [chainError, setChainError] = useState(false);
  const [evolutionDictionary, setEvolutionDictionary] = useState<EvolutionDictionary | null>(null);
  const [abilityNames, setAbilityNames] = useState<Map<number, string>>(new Map());
  const [moveDex, setMoveDex] = useState<Map<string, MoveInfo> | null>(null);
  const [exp100, setExp100] = useState<number | null>(null);
  const [loadingMoves, setLoadingMoves] = useState(true);
  const [moveError, setMoveError] = useState('');
  const [error, setError] = useState('');
  const pokemonMap = useMemo(() => new Map(pokemonIndex.map((p) => [p.id, p])), [pokemonIndex]);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setData(null); setSpecies(null); setChain(null); setChainError(false); setExp100(null); setError(''); setSelectedForm(''); setFormData(null); setFormError(''); setShiny(false);
    Promise.all([
      apiGet<PokemonApi>(`pokemon/${number}`, controller.signal),
      apiGet<SpeciesApi>(`pokemon-species/${number}`, controller.signal),
    ]).then(([p, s]) => { if (!controller.signal.aborted) { setData(p); setSpecies(s); } })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '상세 정보를 불러오지 못했습니다.'); });
    return () => controller.abort();
  }, [number, valid]);

  useEffect(() => {
    if (!data || !selectedForm || selectedForm === data.name) { setFormData(null); setFormError(''); return; }
    const controller = new AbortController();
    setFormData(null); setFormError('');
    apiGet<PokemonApi>(`pokemon/${selectedForm}`, controller.signal)
      .then(result => { if (!controller.signal.aborted) setFormData(result); })
      .catch(() => { if (!controller.signal.aborted) setFormError('선택한 폼의 데이터를 불러오지 못했습니다. 다시 선택해 주세요.'); });
    return () => controller.abort();
  }, [data, selectedForm]);

  useEffect(() => {
    if (!species) return;
    const controller = new AbortController();
    apiGet<EvolutionApi>(species.evolution_chain.url, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setChain(result.chain); })
      .catch(() => { if (!controller.signal.aborted) setChainError(true); });
    return () => controller.abort();
  }, [species]);

  useEffect(() => {
    if (!species) return;
    const controller = new AbortController();
    apiGet<{ levels: { level: number; experience: number }[] }>(species.growth_rate.url, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setExp100(result.levels.find((level) => level.level === 100)?.experience ?? null); })
      .catch(() => {});
    return () => controller.abort();
  }, [species]);

  useEffect(() => {
    let active = true;
    getEvolutionDictionary().then((dictionary) => {
      if (active) setEvolutionDictionary(dictionary);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getAbilityNames().then((names) => { if (active) setAbilityNames(names); }).catch(() => {});
    getMoveInfo().then((moves) => { if (active) setMoveDex(moves); })
      .catch((err: unknown) => { if (active) setMoveError(err instanceof Error ? err.message : '오류'); })
      .finally(() => { if (active) setLoadingMoves(false); });
    return () => { active = false; };
  }, []);

  const nameKo = species ? localizedName(species.names, 'ko', pokemon?.name || '이름 미등록') : (pokemon?.name || `포켓몬 ${number}`);
  const nameJa = species ? localizedName(species.names, 'ja', localizedName(species.names, 'ja-Hrkt')) : '—';
  const nameEn = species ? localizedName(species.names, 'en') : '—';
  const category = species ? (species.genera.find((g) => g.language.name === 'ko')?.genus || '분류 정보 없음') : '—';
  const baseSlug = species?.varieties.find(v => v.is_default)?.pokemon.name || data?.name || '';
  const currentSlug = species?.varieties.some(v => v.pokemon.name === selectedForm) ? selectedForm : baseSlug;
  const currentPokemon = (currentSlug === data?.name || !currentSlug) ? data : (formData?.name === currentSlug ? formData : null);
  const currentForm = species?.varieties.find(v => v.pokemon.name === currentSlug);
  const currentLabel = currentForm ? formLabel(baseSlug, currentSlug, currentForm.is_default) : '기본 모습';
  const regionalDex = (() => {
    const rules: { match: string; dexes: string[]; label: string }[] = [
      { match: '-galar', dexes: ['galar'], label: '가라르도감' },
      { match: '-alola', dexes: ['original-alola', 'updated-alola'], label: '알로라도감' },
      { match: '-hisui', dexes: ['hisui'], label: '히스이도감' },
      { match: '-paldea', dexes: ['paldea'], label: '팔데아도감' },
    ];
    const rule = rules.find(r => currentSlug.includes(r.match));
    if (!rule) return null;
    const dex = species?.pokedex_numbers?.find(x => rule.dexes.includes(x.pokedex.name));
    return dex ? { number: dex.entry_number, label: rule.label } : null;
  })();
  const previous = pokemonMap.get(number - 1);
  const next = pokemonMap.get(number + 1);

  return (
    <main className="detail2-page">
      <div className="detail2-container">
        <nav className="detail2-nav" aria-label="도감 탐색">
          <div className="detail2-nav-top">
            <Link to="/" className="detail2-back">← 검색으로 돌아가기</Link>
            <PokemonSearch compact pokemonIndex={pokemonIndex} loading={loading} error={searchError} />
          </div>
          <div className="detail2-neighbors">
            {number > 1 && <Link className="detail2-prev" to={`/pokemon/${number - 1}`} title={previous?.name || '이전 포켓몬'}>← <span>No.{String(number - 1).padStart(4, '0')} {previous?.name}</span></Link>}
            {number < 1025 && <Link className="detail2-next" to={`/pokemon/${number + 1}`} title={next?.name || '다음 포켓몬'}><span>No.{String(number + 1).padStart(4, '0')} {next?.name}</span> →</Link>}
          </div>
        </nav>
        {!valid ? <p className="detail2-error">잘못된 전국도감 번호입니다.</p> : error ? <p className="detail2-error">{error} <button type="button" onClick={() => window.location.reload()}>다시 시도</button></p> : (!data || !species) ? (
          <p className="detail2-loading">{loading ? '도감 정보를 불러오는 중입니다…' : '상세 정보를 불러오는 중입니다…'}</p>
        ) : (
          <div className="detail2-layout">
            <div className="detail2-main-column">
              <section className="detail2-card detail2-hero">
                <div className="detail2-hero-top"><span className="detail2-number">전국도감 #{String(number).padStart(4, '0')}</span><span className="detail2-genus">{category}</span></div>
                <div className="detail2-hero-profile">
                  <div className="detail2-image">{currentPokemon ? <VariantSprite pokemon={currentPokemon} shiny={shiny} label={nameKo} /> : <span className="detail2-muted">폼 이미지 로딩 중…</span>}</div>
                  <div className="detail2-name-block">
                    <h1>{nameKo}</h1>
                    <p className="dex-current-form">{currentLabel}{regionalDex && <span className="dex-form-code"> · {regionalDex.label} #{String(regionalDex.number).padStart(4, '0')}</span>}</p>
                    <div className="detail2-type-list">
                      {(currentPokemon?.types || []).slice().sort((a,b) => a.slot-b.slot).map((type) => { const typeId=getId(type.type); return typeId ? <TypePill id={typeId} key={typeId} /> : null; })}
                    </div>
                    <div className="dex-shiny-tabs" aria-label="일반색과 색이 다른 모습 선택">
                      <button type="button" className={!shiny ? 'selected' : ''} onClick={() => setShiny(false)}>일반색</button>
                      <button type="button" className={shiny ? 'selected' : ''} onClick={() => setShiny(true)}>✨ 색이 다른 모습</button>
                    </div>
                    <dl className="detail2-names">
                      <div><dt>일칭</dt><dd lang="ja">{nameJa}</dd></div>
                      <div><dt>한칭</dt><dd>{nameKo}</dd></div>
                      <div><dt>영칭</dt><dd lang="en">{nameEn}</dd></div>
                    </dl>
                  </div>
                </div>
                <div className="detail2-dimensions"><span>신장 <strong>{currentPokemon ? (currentPokemon.height / 10).toFixed(1) : '—'} m</strong></span><span>체중 <strong>{currentPokemon ? (currentPokemon.weight / 10).toFixed(1) : '—'} kg</strong></span></div>
                {formError && <p className="detail2-error">{formError}</p>}
              </section>

              <FormPicker species={species} baseSlug={baseSlug} chosen={currentSlug} onChoose={slug => { setSelectedForm(slug); setShiny(false); }} />

              <section className="detail2-card">
                <div className="detail2-card-head"><h2>생태 및 육성 정보</h2></div>
                <dl className="detail2-info-grid">
                  <div><dt>전국도감 번호</dt><dd>#{String(number).padStart(4, '0')}</dd></div>
                  {regionalDex && <div><dt>{regionalDex.label} 번호</dt><dd>#{String(regionalDex.number).padStart(4, '0')}</dd></div>}
                  <div><dt>분류</dt><dd>{category}</dd></div>
                  <div><dt>포획률</dt><dd>{species.capture_rate} <small>/ 255</small></dd></div>
                  <div><dt>성비</dt><dd>{genderLabel(species.gender_rate)}</dd></div>
                  <div><dt>알 그룹</dt><dd>{species.egg_groups.map((g) => EGG_GROUPS[g.name] || '알 그룹 확인 중').join(' · ')}</dd></div>
                  <div><dt>부화 카운트</dt><dd>{species.hatch_counter}회</dd></div>
                  <div><dt>기본 경험치</dt><dd>{currentPokemon?.base_experience ?? '—'}</dd></div>
                  <div><dt>성장 속도</dt><dd>{GROWTH[species.growth_rate.name] || '성장 유형 확인 중'}</dd></div>
                  <div className="detail2-wide"><dt>Lv.100 누적 경험치</dt><dd>{exp100 === null ? '—' : exp100.toLocaleString()}</dd></div>
                </dl>
                <div className="detail2-ability-panel">
                  <h3>특성</h3>
                  <div className="detail2-abilities">
                    {(currentPokemon?.abilities || []).map((item) => {
                      const abilityId = getId(item.ability);
                      return <span key={`${item.ability.name}-${item.slot}`} className={`detail2-ability ${item.is_hidden ? 'hidden' : ''}`}>
                        <small>{item.is_hidden ? '숨겨진 특성' : '일반 특성'}</small>
                        <strong>{(abilityId && abilityNames.get(abilityId)) || '특성명 확인 중'}</strong>
                      </span>;
                    })}
                  </div>
                </div>
                <p className="detail2-footnote">포획률은 PokéAPI의 기본 수치입니다. 실제 포획 확률과 다릅니다. 기본 경험치는 쓰러뜨렸을 때 얻는 경험치의 기준값입니다.</p>
              </section>

              {currentPokemon ? <StatCard pokemon={currentPokemon} /> : <p className="detail2-muted">선택한 폼의 종족값을 불러오는 중입니다…</p>}

              {currentPokemon && <HeldItems key={`held-${currentPokemon.id}`} pokemon={currentPokemon} itemNames={evolutionDictionary?.items || new Map()} />}
              {currentPokemon && <EncounterLocations key={`encounters-${currentPokemon.id}`} pokemon={currentPokemon} />}

              <section className="detail2-card">
                <div className="detail2-card-head"><h2>진화트리</h2></div>
                {chain ? (
                  <div className="detail2-evo-scroll"><EvolutionNode node={chain} current={number} index={pokemonMap} dictionary={evolutionDictionary} /></div>
                ) : <p className="detail2-muted">{chainError ? '진화 정보를 불러오지 못했습니다.' : '진화 정보를 불러오는 중입니다…'}</p>}
                <p className="detail2-footnote">진화 방법은 게임 버전에 따라 달라질 수 있습니다. 포켓몬을 누르면 해당 도감으로 이동합니다.</p>
              </section>
            </div>
            <div className="detail2-move-column">
              {currentPokemon ? <MoveCard key={currentPokemon.id} pokemon={currentPokemon} moveDex={moveDex} loading={loadingMoves} error={moveError} /> : <section className="detail2-card"><p className="detail2-muted">선택한 폼의 기술 데이터를 불러오는 중입니다…</p></section>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
