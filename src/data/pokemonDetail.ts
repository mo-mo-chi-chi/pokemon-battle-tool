export type Resource = { name: string; url: string };
export type LocalName = { name: string; language: Resource };
export interface PokemonApi {
  id: number;
  name: string;
  location_area_encounters: string;
  types: { slot: number; type: Resource }[];
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: {
      home?: { front_default: string | null; front_shiny: string | null };
      'official-artwork'?: { front_default: string | null; front_shiny: string | null };
      showdown?: { front_default: string | null; front_shiny: string | null };
    };
  };
  held_items: { item: Resource; version_details: { rarity: number; version: Resource }[] }[];
  base_experience: number | null;
  height: number;
  weight: number;
  stats: { base_stat: number; stat: Resource }[];
  abilities: { is_hidden: boolean; slot: number; ability: Resource }[];
  moves: { move: Resource; version_group_details: { level_learned_at: number; move_learn_method: Resource; version_group: Resource }[] }[];
}
export interface SpeciesApi {
  pokedex_numbers?: { entry_number: number; pokedex: Resource }[];
  varieties: { is_default: boolean; pokemon: Resource }[];
  names: LocalName[];
  genera: { genus: string; language: Resource }[];
  capture_rate: number;
  gender_rate: number;
  egg_groups: Resource[];
  hatch_counter: number;
  growth_rate: Resource;
  evolution_chain: { url: string };
}
export interface EvolutionCondition {
  trigger: Resource;
  item: Resource | null;
  held_item: Resource | null;
  min_level: number | null;
  min_happiness?: number | null;
  min_beauty?: number | null;
  min_affection?: number | null;
  time_of_day?: string;
  known_move?: Resource | null;
  location?: Resource | null;
  needs_overworld_rain?: boolean;
  needs_multiplayer?: boolean;
  turn_upside_down?: boolean;
  gender?: number | null;
  relative_physical_stats?: number | null;
  party_species?: Resource | null;
  party_type?: Resource | null;
  trade_species?: Resource | null;
  known_move_type?: Resource | null;
  overworld_weather?: string | null;
}
export interface ChainLink {
  species: Resource;
  evolution_details: EvolutionCondition[];
  evolves_to: ChainLink[];
}
export interface EvolutionApi { chain: ChainLink }
export interface MoveInfo {
  name: string;
  typeId: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: number;
}
export interface VersionGroup { id: string; label: string; gen: number }

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = path.startsWith('https://')
    ? path
    : path.startsWith('/api/v2/')
      ? `https://pokeapi.co${path}`
      : `https://pokeapi.co/api/v2/${path.replace(/^\/+|\/+$/g, '')}/`;
  const res = await fetch(url, { signal, cache: 'force-cache' });
  if (!res.ok) throw new Error(`PokéAPI 오류: ${res.status}`);
  return res.json() as Promise<T>;
}

const CSV_BASE = [
  'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv',
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv',
];
async function fetchCsv(file: string): Promise<string> {
  for (const base of CSV_BASE) {
    try {
      const result = await fetch(`${base}/${file}`, { cache: 'force-cache' });
      if (result.ok) return result.text();
    } catch { /* 대체 미러 사용 */ }
  }
  throw new Error(`${file} 파일에 연결하지 못했습니다.`);
}
// CSV 따옴표와 쉼표를 처리합니다. (PokéAPI 번역 데이터는 각 행에 줄바꿈이 없습니다.)
function rows(csv: string): string[][] {
  return csv.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const out: string[] = [];
    let value = '';
    let quote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quote && line[i + 1] === '"') { value += '"'; i++; }
        else quote = !quote;
      } else if (line[i] === ',' && !quote) { out.push(value); value = ''; }
      else value += line[i];
    }
    out.push(value);
    return out;
  });
}
function koNames(csv: string) {
  const names = new Map<number, string>();
  for (const [id, language, name] of rows(csv)) {
    if (language === '3' && name) names.set(Number(id), name);
  }
  return names;
}
let abilityCache: Promise<Map<number, string>> | null = null;
export function getAbilityNames() {
  if (!abilityCache) abilityCache = fetchCsv('ability_names.csv').then(koNames).catch((err) => { abilityCache = null; throw err; });
  return abilityCache;
}
let moveCache: Promise<Map<string, MoveInfo>> | null = null;
export function getMoveInfo() {
  if (!moveCache) moveCache = Promise.all([fetchCsv('moves.csv'), fetchCsv('move_names.csv')])
    .then(([data, namesCsv]) => {
      const names = koNames(namesCsv);
      const moves = new Map<string, MoveInfo>();
      for (const row of rows(data)) {
        const [id, identifier, , typeId, power, pp, accuracy, , , damageClass] = row;
        if (!identifier) continue;
        moves.set(identifier, {
          name: names.get(Number(id)) || identifier.replaceAll('-', ' '),
          typeId: Number(typeId),
          power: power ? Number(power) : null,
          accuracy: accuracy ? Number(accuracy) : null,
          pp: pp ? Number(pp) : null,
          damageClass: Number(damageClass),
        });
      }
      return moves;
    }).catch((err) => { moveCache = null; throw err; });
  return moveCache;
}

export const versionGroups: VersionGroup[] = [
  {id:'red-blue',label:'레드·블루',gen:1}, {id:'yellow',label:'피카츄',gen:1},
  {id:'gold-silver',label:'금·은',gen:2}, {id:'crystal',label:'크리스탈',gen:2},
  {id:'ruby-sapphire',label:'루비·사파이어',gen:3}, {id:'emerald',label:'에메랄드',gen:3}, {id:'firered-leafgreen',label:'파이어레드·리프그린',gen:3},
  {id:'diamond-pearl',label:'다이아몬드·펄',gen:4}, {id:'platinum',label:'플라티나',gen:4}, {id:'heartgold-soulsilver',label:'하트골드·소울실버',gen:4},
  {id:'black-white',label:'블랙·화이트',gen:5}, {id:'black-2-white-2',label:'블랙2·화이트2',gen:5},
  {id:'x-y',label:'X·Y',gen:6}, {id:'omega-ruby-alpha-sapphire',label:'오메가루비·알파사파이어',gen:6},
  {id:'sun-moon',label:'썬·문',gen:7}, {id:'ultra-sun-ultra-moon',label:'울트라썬·울트라문',gen:7}, {id:'lets-go-pikachu-lets-go-eevee',label:'레츠고 피카츄·이브이',gen:7},
  {id:'sword-shield',label:'소드·실드',gen:8}, {id:'brilliant-diamond-and-shining-pearl',label:'브릴리언트 다이아몬드·샤이닝 펄',gen:8}, {id:'legends-arceus',label:'레전드 아르세우스',gen:8},
  {id:'scarlet-violet',label:'스칼렛·바이올렛',gen:9},
];
export const EGG_GROUPS: Record<string, string> = {
  monster:'괴수', water1:'수중1', water2:'수중2', water3:'수중3', bug:'벌레',
  flying:'비행', field:'육상', fairy:'요정', grass:'식물', 'human-like':'인간형',
  mineral:'광물', amorphous:'부정형', ditto:'메타몽', dragon:'드래곤',
  'no-eggs':'미발견', undiscovered:'미발견', indeterminate:'부정형',
};
export const GROWTH: Record<string, string> = {
  slow:'느림',medium:'보통',fast:'빠름','medium-slow':'다소 느림',
  'slow-then-very-fast':'불규칙','fast-then-very-slow':'변동',
};
export const METHODS: Record<string, string> = {
  'level-up':'레벨업',machine:'기술머신',egg:'교배기',tutor:'기술가르침',
  'form-change':'폼 변경','stadium-surfing-pikachu':'특전',
  'light-ball-egg':'특전 교배','colosseum-purification':'정화',
  'xd-purification':'정화', 'xd-shadow':'XD', 'zygarde-cube':'지가르데큐브',
};
export const DAMAGE_CLASS: Record<number,string> = {1:'변화',2:'물리',3:'특수'};
export function localizedName(data: { name:string; language:Resource }[], lang: string, fallback = '—') {
  return data.find((item) => item.language.name === lang)?.name || fallback;
}
export function getId(resource: Resource) {
  const result = resource.url.match(/\/(\d+)\/?$/);
  return result ? Number(result[1]) : null;
}
export function genderLabel(rate: number) {
  if (rate === -1) return '무성';
  const male = (8 - rate) * 12.5;
  const female = rate * 12.5;
  return `♂ ${male}%  /  ♀ ${female}%`;
}
// 진화 조건에 등장하는 도구·장소·기술 이름을 한국어 CSV에서 확인합니다.
export interface EvolutionDictionary {
  items: Map<number, string>;
  locations: Map<number, string>;
  moves: Map<string, string>;
}
let evoDictionaryCache: Promise<EvolutionDictionary> | null = null;
export function getEvolutionDictionary(): Promise<EvolutionDictionary> {
  if (!evoDictionaryCache) {
    evoDictionaryCache = Promise.allSettled([
      fetchCsv('item_names.csv').then(koNames),
      fetchCsv('location_names.csv').then(koNames),
      getMoveInfo(),
    ]).then(([items, locations, moves]) => ({
      items: items.status === 'fulfilled' ? items.value : new Map<number, string>(),
      locations: locations.status === 'fulfilled' ? locations.value : new Map<number, string>(),
      moves: moves.status === 'fulfilled' ? new Map([...moves.value].map(([key, value]) => [key, value.name])) : new Map<string, string>(),
    }));
  }
  return evoDictionaryCache;
}

// PokéAPI의 식별자는 영어입니다. 번역이 없을 때 식별자를 그대로 노출하지 않습니다.
const itemNames: Record<string, string> = {
  'fire-stone':'불꽃의돌', 'water-stone':'물의돌', 'thunder-stone':'천둥의돌',
  'leaf-stone':'리프의돌', 'moon-stone':'달의돌', 'sun-stone':'태양의돌',
  'shiny-stone':'빛의돌', 'dusk-stone':'어둠의돌', 'dawn-stone':'각성의돌',
  'ice-stone':'얼음의돌', 'oval-stone':'동글동글돌', 'linking-cord':'연결의끈',
  'metal-coat':'금속코트', 'metal-alloy':'복합금속', 'kings-rock':'왕의징표석',
  'dragon-scale':'용의비늘', 'upgrade':'업그레이드', 'dubious-disc':'괴상한패치',
  'protector':'프로텍터', 'electirizer':'에레키부스터', 'magmarizer':'마그마부스터',
  'reaper-cloth':'영계의천', 'razor-claw':'예리한손톱', 'razor-fang':'예리한이빨',
  'prism-scale':'고운비늘', 'deep-sea-tooth':'심해의이빨', 'deep-sea-scale':'심해의비늘',
};
const triggerNames: Record<string, string> = {
  'level-up':'레벨업', 'trade':'교환', 'use-item':'도구 사용', 'shed':'특수 진화',
  'spin':'회전', 'tower-of-darkness':'악의 탑', 'tower-of-waters':'물의 탑',
  'three-critical-hits':'한 번의 배틀에서 급소 3회',
  'take-damage':'일정 피해를 받은 후', 'agile-style-move':'속공 사용',
  'strong-style-move':'강공 사용', 'recoil-damage':'반동 피해',
  'other':'특수 조건',
};
function itemLabel(resource: Resource, dictionary?: EvolutionDictionary | null): string {
  const id = getId(resource);
  return (id === null ? undefined : dictionary?.items.get(id)) || itemNames[resource.name] || '특정 도구';
}
function locationLabel(resource: Resource, dictionary?: EvolutionDictionary | null): string {
  const id = getId(resource);
  return (id === null ? undefined : dictionary?.locations.get(id)) || '특정 장소';
}
function moveLabel(resource: Resource, dictionary?: EvolutionDictionary | null): string {
  return dictionary?.moves.get(resource.name) || '특정 기술';
}

export function evolutionLabel(details: EvolutionCondition[], dictionary?: EvolutionDictionary | null): string {
  if (!details.length) return '진화 조건 확인 중';
  // 동일한 조건이 게임 버전별로 반복될 수 있으므로 중복 문구를 제거합니다.
  const labels = details.map((d) => {
    const parts: string[] = [];
    const trigger = d.trigger.name;
    if (trigger === 'trade') parts.push('교환');
    if (trigger === 'shed') parts.push('특수 진화');
    if (trigger === 'spin') parts.push('회전');
    if (d.min_level !== null && d.min_level !== undefined) parts.push(`Lv.${d.min_level}`);
    if (d.item) parts.push(`${itemLabel(d.item, dictionary)} 사용`);
    if (d.held_item) parts.push(`${itemLabel(d.held_item, dictionary)} 지닌 상태`);
    if (d.min_happiness != null) parts.push(`친밀도 ${d.min_happiness} 이상`);
    if (d.min_beauty != null) parts.push(`아름다움 ${d.min_beauty} 이상`);
    if (d.min_affection != null) parts.push(`애정도 ${d.min_affection} 이상`);
    if (d.time_of_day) parts.push(d.time_of_day === 'day' ? '낮' : d.time_of_day === 'night' ? '밤' : '특정 시간대');
    if (d.known_move) parts.push(`${moveLabel(d.known_move, dictionary)} 습득`);
    if (d.location) parts.push(`${locationLabel(d.location, dictionary)}에서`);
    if (d.gender === 1) parts.push('암컷');
    if (d.gender === 2) parts.push('수컷');
    if (d.needs_overworld_rain) parts.push('비가 올 때');
    if (d.needs_multiplayer) parts.push('멀티플레이 중');
    if (d.turn_upside_down) parts.push('기기를 거꾸로');
    if (d.relative_physical_stats === 1) parts.push('공격 > 방어');
    if (d.relative_physical_stats === -1) parts.push('공격 < 방어');
    if (d.relative_physical_stats === 0) parts.push('공격 = 방어');
    if (d.known_move_type) parts.push('특정 타입 기술 습득');
    if (d.party_species) parts.push('특정 포켓몬과 동행');
    if (d.party_type) parts.push('특정 타입 포켓몬과 동행');
    if (d.trade_species) parts.push('특정 포켓몬과 교환');
    if (d.overworld_weather) parts.push('특정 날씨');
    return parts.length ? parts.join(' · ') : triggerNames[trigger] || '특수 조건';
  });
  return [...new Set(labels)].join(' 또는 ');
}
