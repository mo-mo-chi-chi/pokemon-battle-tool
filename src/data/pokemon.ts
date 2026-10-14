export interface PokemonEntry {
  id: number;
  name: string;
  types: number[];
}

interface TypeInfo {
  label: string;
  icon: string;
  color: string;
}

// 소드·실드(8세대) 게임의 실제 타입 심볼 이미지 경로
const typeIcon = (type: string) => `types/gen8/${type}.png`;

export const TYPE_INFO: Record<number, TypeInfo> = {
  1: { label: '노말', icon: typeIcon('normal'), color: '#a8a77a' },
  2: { label: '격투', icon: typeIcon('fighting'), color: '#c22e28' },
  3: { label: '비행', icon: typeIcon('flying'), color: '#a98ff3' },
  4: { label: '독', icon: typeIcon('poison'), color: '#a33ea1' },
  5: { label: '땅', icon: typeIcon('ground'), color: '#e2bf65' },
  6: { label: '바위', icon: typeIcon('rock'), color: '#b6a136' },
  7: { label: '벌레', icon: typeIcon('bug'), color: '#a6b91a' },
  8: { label: '고스트', icon: typeIcon('ghost'), color: '#735797' },
  9: { label: '강철', icon: typeIcon('steel'), color: '#b7b7ce' },
  10: { label: '불꽃', icon: typeIcon('fire'), color: '#ee8130' },
  11: { label: '물', icon: typeIcon('water'), color: '#6390f0' },
  12: { label: '풀', icon: typeIcon('grass'), color: '#7ac74c' },
  13: { label: '전기', icon: typeIcon('electric'), color: '#f7d02c' },
  14: { label: '에스퍼', icon: typeIcon('psychic'), color: '#f95587' },
  15: { label: '얼음', icon: typeIcon('ice'), color: '#96d9d6' },
  16: { label: '드래곤', icon: typeIcon('dragon'), color: '#6f35fc' },
  17: { label: '악', icon: typeIcon('dark'), color: '#705746' },
  18: { label: '페어리', icon: typeIcon('fairy'), color: '#d685ad' },
};

const DATA_SOURCE = [
  'https://cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv',
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv',
];

async function fetchCsv(fileName: string): Promise<string> {
  for (const base of DATA_SOURCE) {
    try {
      const response = await fetch(`${base}/${fileName}`);
      if (!response.ok) continue;
      const text = await response.text();
      if (text.includes('\n')) return text;
    } catch {
      // CDN 연결 실패 시 다음 주소를 이용합니다.
    }
  }
  throw new Error(`도감 데이터를 불러올 수 없습니다: ${fileName}`);
}

let indexPromise: Promise<PokemonEntry[]> | null = null;

export function loadPokemonIndex(): Promise<PokemonEntry[]> {
  if (indexPromise) return indexPromise;

  indexPromise = Promise.all([
    fetchCsv('pokemon_species_names.csv'),
    fetchCsv('pokemon_types.csv'),
  ])
    .then(([namesCsv, typesCsv]) => {
      const entries = new Map<number, PokemonEntry>();

      // local_language_id === 3: 한국어
      for (const line of namesCsv.split(/\r?\n/).slice(1)) {
        const [rawId, language, name] = line.split(',');
        const id = Number(rawId);
        if (language === '3' && id >= 1 && id <= 1025 && name) {
          entries.set(id, { id, name, types: [] });
        }
      }

      // 기본 형태의 타입 데이터 (전국도감 ID 1~1025)
      for (const line of typesCsv.split(/\r?\n/).slice(1)) {
        const [rawId, rawType, rawSlot] = line.split(',');
        const id = Number(rawId);
        const typeId = Number(rawType);
        const slot = Number(rawSlot);
        const pokemon = entries.get(id);
        if (pokemon && TYPE_INFO[typeId] && (slot === 1 || slot === 2)) {
          pokemon.types[slot - 1] = typeId;
        }
      }

      const result = [...entries.values()]
        .map((pokemon) => ({
          ...pokemon,
          types: pokemon.types.filter(Boolean),
        }))
        .sort((a, b) => a.id - b.id);

      if (!result.length) throw new Error('검색 가능한 포켓몬이 없습니다.');
      return result;
    })
    .catch((error: unknown) => {
      indexPromise = null; // 실패했을 때 다시 시도 가능
      throw error;
    });

  return indexPromise;
}

export function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function getFallbackSpriteUrl(id: number): string {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`;
}
