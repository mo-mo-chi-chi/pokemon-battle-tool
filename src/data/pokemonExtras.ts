import { apiGet, getEvolutionDictionary, getId, type PokemonApi, type Resource } from './pokemonDetail';

export const VERSION_LABELS: Record<string, string> = {
  red:'레드', green:'그린', blue:'블루', yellow:'피카츄', gold:'금', silver:'은', crystal:'크리스탈',
  ruby:'루비', sapphire:'사파이어', emerald:'에메랄드', firered:'파이어레드', leafgreen:'리프그린',
  diamond:'다이아몬드', pearl:'펄', platinum:'플라티나', heartgold:'하트골드', soulsilver:'소울실버',
  black:'블랙', white:'화이트', 'black-2':'블랙2', 'white-2':'화이트2',
  x:'X', y:'Y', 'omega-ruby':'오메가루비', 'alpha-sapphire':'알파사파이어',
  sun:'썬', moon:'문', 'ultra-sun':'울트라썬', 'ultra-moon':'울트라문',
  'lets-go-pikachu':'레츠고 피카츄', 'lets-go-eevee':'레츠고 이브이',
  sword:'소드', shield:'실드', 'brilliant-diamond':'브릴리언트 다이아몬드', 'shining-pearl':'샤이닝 펄',
  'legends-arceus':'레전드 아르세우스', scarlet:'스칼렛', violet:'바이올렛',
  'legends-za':'레전드 Z-A', champions:'챔피언스',
  'the-isle-of-armor-sword':'소드 · 갑옷의 외딴섬', 'the-isle-of-armor-shield':'실드 · 갑옷의 외딴섬',
  'the-crown-tundra-sword':'소드 · 왕관의 설원', 'the-crown-tundra-shield':'실드 · 왕관의 설원',
  'isle-of-armor-sword':'소드 · 갑옷의 외딴섬', 'isle-of-armor-shield':'실드 · 갑옷의 외딴섬',
  'crown-tundra-sword':'소드 · 왕관의 설원', 'crown-tundra-shield':'실드 · 왕관의 설원',
};
export function versionLabel(id: string) {
  if (VERSION_LABELS[id]) return VERSION_LABELS[id];
  if (id.includes('isle-of-armor')) return `${id.endsWith('sword') ? '소드' : id.endsWith('shield') ? '실드' : '8세대'} · 갑옷의 외딴섬`;
  if (id.includes('crown-tundra')) return `${id.endsWith('sword') ? '소드' : id.endsWith('shield') ? '실드' : '8세대'} · 왕관의 설원`;
  // API 신규 게임 식별자가 등록되기 전에는 영어 내부 코드를 UI에 노출하지 않습니다.
  return '추가 게임 (한국어 명칭 미등록)';
}

// 모든 주요 본가 게임을 버전 선택기에 노출합니다. 실제 소지 확률 기록과는 분리합니다.
// Green은 일본판 녹 버전입니다. PokéAPI가 별도 기록을 제공하지 않아도 선택할 수 있습니다.
export const HELD_ITEM_GAME_GROUPS = [
  { label: '1세대', versions: ['red','green','blue','yellow'] },
  { label: '2세대', versions: ['gold','silver','crystal'] },
  { label: '3세대', versions: ['ruby','sapphire','emerald','firered','leafgreen'] },
  { label: '4세대', versions: ['diamond','pearl','platinum','heartgold','soulsilver'] },
  { label: '5세대', versions: ['black','white','black-2','white-2'] },
  { label: '6세대', versions: ['x','y','omega-ruby','alpha-sapphire'] },
  { label: '7세대', versions: ['sun','moon','ultra-sun','ultra-moon','lets-go-pikachu','lets-go-eevee'] },
  { label: '8세대', versions: ['sword','shield','the-isle-of-armor-sword','the-isle-of-armor-shield',
    'the-crown-tundra-sword','the-crown-tundra-shield','isle-of-armor-sword','isle-of-armor-shield',
    'crown-tundra-sword','crown-tundra-shield','brilliant-diamond','shining-pearl','legends-arceus'] },
  { label: '9세대', versions: ['scarlet','violet'] },
  { label: '기타 최신작', versions: ['legends-za','champions'] },
] as const;
export const HELD_ITEM_VERSIONS = HELD_ITEM_GAME_GROUPS.flatMap(g => [...g.versions]);
// API 반환 순서는 시간 순서가 아니므로 명시적인 세대/버전 순서를 사용합니다.
const VERSION_ORDER = new Map<string, number>(HELD_ITEM_VERSIONS.map((name, index) => [name, index]));
export function versionOrder(a: string, b: string): number {
  return (VERSION_ORDER.get(a) ?? 9999) - (VERSION_ORDER.get(b) ?? 9999) || a.localeCompare(b);
}



const FORM_SUFFIX: Record<string, string> = {
  'mega':'메가진화', 'mega-x':'메가진화 X', 'mega-y':'메가진화 Y',
  'primal':'원시회귀', 'gmax':'거다이맥스',
  'alola':'알로라의 모습', 'galar':'가라르의 모습', 'hisui':'히스이의 모습', 'paldea':'팔데아의 모습',
  'paldea-combat-breed':'팔데아의 모습 (컴뱃종)',
  'paldea-blaze-breed':'팔데아의 모습 (블레이즈종)',
  'paldea-aqua-breed':'팔데아의 모습 (아쿠아종)',
  'origin':'오리진폼', 'altered':'어나더폼', 'sky':'스카이폼', 'land':'랜드폼',
  'therian':'영물폼', 'incarnate':'화신폼', 'attack':'어택폼', 'defense':'디펜스폼', 'speed':'스피드폼',
  'wash':'워시로토무', 'heat':'히트로토무', 'frost':'프로스트로토무', 'fan':'스핀로토무', 'mow':'커트로토무',
  'zen':'달마모드', 'galar-zen':'가라르의 모습 (달마모드)',
  'dusk':'황혼의 모습', 'midday':'한낮의 모습', 'midnight':'한밤중의 모습',
  'school':'군집의 모습', 'solo':'단독의 모습', 'complete':'퍼펙트폼',
  '10':'10%폼', '50':'50%폼', 'low-key':'로우키의 모습', 'amped':'하이한 모습',
  'normal':'노말폼', 'sandy':'모래땅도롱', 'trash':'슈레도롱', 'plant':'초목도롱',
  'red-striped':'적색근의 모습', 'blue-striped':'청색근의 모습', 'white-striped':'백색근의 모습',
  'white':'백색의 모습', 'black':'흑색의 모습', 'pirouette':'스텝폼', 'aria':'보이스폼',
  'resolute':'각오의 모습', 'ordinary':'평소의 모습', 'ash':'지우의 모습',
  'ice':'백마 탄 모습', 'shadow':'흑마 탄 모습', 'unbound':'굴레를 벗어난 모습', 'confined':'굴레에 빠진 모습',
  'sunny':'태양의 모습', 'rainy':'빗방울의 모습', 'snowy':'설운의 모습',
  'average':'보통 크기', 'small':'작은 크기', 'large':'큰 크기', 'super':'특대 크기',
  'zero':'제로폼', 'family-of-three':'세 식구', 'family-of-four':'네 식구',
  'curly':'컬리폼', 'droopy':'드루피폼', 'stretchy':'스트레치폼',
  'hero':'역전의 용사', 'crowned':'검왕·방패왕', 'bloodmoon':'붉은 달의 모습',
  'terastal':'테라스탈폼', 'stellar':'스텔라폼',
  'wellspring-mask':'우물의 가면', 'hearthflame-mask':'화덕의 가면', 'cornerstone-mask':'주춧돌의 가면',
};
export type FormGroup = '기본'|'메가진화'|'원시회귀'|'거다이맥스'|'리전폼'|'다른 모습';
export function formGroup(baseSlug: string, name: string, isDefault: boolean): FormGroup {
  if (isDefault || baseSlug === name) return '기본';
  if (/-mega(?:-|$)/.test(name)) return '메가진화';
  if (/-primal(?:-|$)/.test(name)) return '원시회귀';
  if (name.includes('-gmax')) return '거다이맥스';
  if (/-alola(?:-|$)|-galar(?:-|$)|-hisui(?:-|$)|-paldea(?:-|$)/.test(name)) return '리전폼';
  return '다른 모습';
}
export function formLabel(baseSlug: string, name: string, isDefault: boolean): string {
  if (isDefault || baseSlug === name) return '기본 모습';
  const suffix = name.startsWith(`${baseSlug}-`) ? name.slice(baseSlug.length + 1) : name;
  if (name === 'palafin-hero') return '마이티폼';
  if (name === 'zacian-crowned') return '검왕의 모습';
  if (name === 'zamazenta-crowned') return '방패왕의 모습';
  if (FORM_SUFFIX[suffix]) return FORM_SUFFIX[suffix];
  // 한국어 번역을 임의로 만들지 않고 확인이 필요한 폼으로 표시
  return `다른 모습 (${suffix.replaceAll('-', ' ')})`; // 공식 한국어 폼 명칭이 없는 경우 원본 식별자를 괄호로 보존
}
// 폼별 ID와 종별 전국도감 번호를 섞지 않습니다. 색이 다른 모습은 해당 폼의
// 실제 이미지 후보만 사용하고, 없는 이미지를 기본색으로 대신 표시하지 않습니다.
export function imageCandidates(data: PokemonApi, shiny: boolean): string[] {
  const sprite = data.sprites;
  const home = sprite?.other?.home;
  const artwork = sprite?.other?.['official-artwork'];
  const showdown = sprite?.other?.showdown;
  const root = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  const candidateId = data.id;
  const known: (string | null | undefined)[] = shiny
    ? [
        sprite?.front_shiny,
        home?.front_shiny,
        artwork?.front_shiny,
        showdown?.front_shiny,
        `${root}/shiny/${candidateId}.png`,
        `${root}/other/home/shiny/${candidateId}.png`,
        `${root}/other/official-artwork/shiny/${candidateId}.png`,
        `${root}/other/showdown/shiny/${candidateId}.gif`,
        `${root}/versions/generation-ix/champions/shiny/${candidateId}.png`,
      ]
    : [
        sprite?.front_default,
        home?.front_default,
        artwork?.front_default,
        `${root}/${candidateId}.png`,
        `${root}/other/home/${candidateId}.png`,
      ];
  // 중복 제거. API에서 주소가 null이면 정확한 폼 ID로 재시도합니다.
  return [...new Set(known.filter((url): url is string => Boolean(url)))];
}

export interface PokemonEncounter {
  location_area: Resource;
  version_details: { version: Resource; max_chance: number; encounter_details: {
    min_level: number; max_level: number; chance: number; method: Resource;
  }[] }[];
}
export interface LocationAreaApi {
  name?: string;
  names: { name: string; language: Resource }[];
  location: Resource;
}
export interface LocationApi {
  name?: string;
  names: { name: string; language: Resource }[];
}

// 게임 한국어 지명이 PokéAPI에 빠져 있는 곳만 보완합니다.
// 키는 PokéAPI 영어 slug입니다. 기존 명칭이 없는 곳에 임의 한국어를 만들지는 않습니다.
export const KNOWN_KO_LOCATION_NAMES: Record<string, string> = {
  'the-isle-of-armor':'갑옷섬', 'isle-of-armor':'갑옷섬',
  'fields-of-honor':'인사의 들판',
  'soothing-wetlands':'청량한 습지초원',
  'forest-of-focus':'집중의 숲',
  'training-lowlands':'단련 평원',
  'warm-up-tunnel':'연습의 동굴',
  'potbottom-desert':'냄비바닥사막',
  'brawlers-cave':'파이트케이브',
  'challenge-road':'챌린지로드',
  'challenge-beach':'챌린지비치',
  'courageous-cavern':'투지의 동굴',
  'loop-lagoon':'원환의 만',
  'workout-sea':'워크아웃 바다',
  'stepping-stone-sea':'열도 바다',
  'insular-sea':'외딴섬 해역',
  'honeycalm-sea':'허니컴 바다',
  'honeycalm-island':'허니컴섬',
  'the-crown-tundra':'왕관설원', 'crown-tundra':'왕관설원',
};
function mapKnownKorean(slug: string | undefined): string | null {
  if (!slug) return null;
  // 이름은 지역명 뒤에 "-area", "-sword", "-shield" 등이 붙을 수 있습니다.
  const normalized = slug.toLowerCase().replace(/_/g, '-');
  for (const key of Object.keys(KNOWN_KO_LOCATION_NAMES).sort((a, b) => b.length - a.length)) {
    if (normalized === key || normalized.startsWith(key + '-')) return KNOWN_KO_LOCATION_NAMES[key];
  }
  return null;
}
// 도로 번호처럼 규칙이 분명한 지역은 한국어로 변환합니다.
const KO_REGIONS: Record<string, string> = {
  kanto:'관동', johto:'성도', hoenn:'호연', sinnoh:'신오', unova:'하나',
  kalos:'칼로스', alola:'알로라', galar:'가라르', hisui:'히스이', paldea:'팔데아',
};
function translatedRoute(slug: string | undefined): string | null {
  if (!slug) return null;
  const match = slug.match(/^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea)-route-(\d+)(?:-|$)/);
  if (match) return `${KO_REGIONS[match[1]]} ${Number(match[2])}번도로`;
  return null;
}
function localizedName(names: LocationAreaApi['names'] | undefined, locale: string) {
  return names?.find(n => n.language?.name === locale)?.name || null;
}
function koreanLocation(slug: string | undefined): string | null {
  return mapKnownKorean(slug) || translatedRoute(slug);
}
// 공식 한국어 명칭과 확인된 한국어 대응표만 사용합니다.
// 정확한 이름을 모르면 추측 번역하거나 영어 내부 코드·숫자를 노출하지 않습니다.
function missingLocationName(): string {
  return '한국어 지명 자료 없음';
}

const areaNameCache = new Map<string, Promise<string>>();
export function getAreaName(area: Resource): Promise<string> {
  const cached = areaNameCache.get(area.url);
  if (cached) return cached;
  const promise = (async () => {
    const fallback = koreanLocation(area.name);
    try {
      const result = await apiGet<LocationAreaApi>(area.url);
      const koArea = localizedName(result.names, 'ko') || koreanLocation(result.name || area.name);
      if (koArea) return koArea;
      if (result.location?.url) {
        try {
          const location = await apiGet<LocationApi>(result.location.url);
          const koPlace = localizedName(location.names, 'ko') || koreanLocation(location.name || result.location.name);
          if (koPlace) return koPlace;
          // API location.names에서 한국어가 빠져 있어도 PokéAPI 원본 한국어 CSV를 재확인합니다.
          const locationId = getId(result.location);
          if (locationId !== null) {
            const dictionary = await getEvolutionDictionary();
            const csvKorean = dictionary.locations.get(locationId);
            if (csvKorean) return csvKorean;
          }
        } catch { /* 부가 지명 조회 실패는 목록 전체를 막지 않습니다. */ }
      }
      return fallback || missingLocationName();
    } catch {
      return fallback || missingLocationName();
    }
  })();
  areaNameCache.set(area.url, promise);
  return promise;
}
