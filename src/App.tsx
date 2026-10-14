import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { getFallbackSpriteUrl, getSpriteUrl, loadPokemonIndex, type PokemonEntry } from './data/pokemon';
import PokemonSearch from './components/PokemonSearch';
import PokemonDetailPage from './pages/PokemonDetailPage';
import './App.css';

const DAILY_KEY = 'pokemon-daily-lineup';
const CRY_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';

function getToday(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function getDailyPokemon(): number[] {
  const today = getToday();
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null');
    const ids: unknown = saved?.pokemon;
    if (saved?.date === today && Array.isArray(ids) && ids.length === 5 &&
      new Set(ids).size === 5 && ids.every((id) => Number.isInteger(id) && id >= 1 && id <= 649)) {
      return ids as number[];
    }
  } catch { /* 잘못된 캐시는 무시 */ }
  const selected = new Set<number>();
  while (selected.size < 5) selected.add(Math.floor(Math.random() * 649) + 1);
  const pokemon = [...selected];
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, pokemon })); }
  catch { /* 저장소가 차단되어도 동작 */ }
  return pokemon;
}

function HomeSprite({ id }: { id: number }) {
  const [fallback, setFallback] = useState(false);
  return (
    <img
      className="pokemon-sprite"
      src={fallback ? getFallbackSpriteUrl(id) : getSpriteUrl(id)}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFallback(true)}
    />
  );
}

function HomePage({ pokemonIndex, loading, error }: { pokemonIndex: PokemonEntry[]; loading: boolean; error: string }) {
  const [dailyPokemon, setDailyPokemon] = useState(getDailyPokemon);
  // 오늘의 다섯 마리 울음소리를 재사용합니다. 포켓몬을 바꿔 가며
  // 호버할 때 소리가 겹치지 않도록 이전 소리는 정지합니다.
  const cryCacheRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const activeCryRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setDailyPokemon(getDailyPokemon()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const cache = new Map<number, HTMLAudioElement>();
    dailyPokemon.forEach((id) => {
      const audio = new Audio(`${CRY_BASE_URL}/${id}.ogg`);
      audio.preload = 'auto';
      audio.volume = 0.55;
      cache.set(id, audio);
    });
    cryCacheRef.current = cache;

    return () => {
      activeCryRef.current?.pause();
      activeCryRef.current = null;
      cache.forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
      cryCacheRef.current.clear();
    };
  }, [dailyPokemon]);

  const playCry = (id: number) => {
    const audio = cryCacheRef.current.get(id);
    if (!audio) return;
    activeCryRef.current?.pause();
    if (activeCryRef.current) activeCryRef.current.currentTime = 0;
    audio.currentTime = 0;
    activeCryRef.current = audio;
    // 브라우저가 첫 사용자 상호작용 전 재생을 차단할 수 있습니다.
    void audio.play().catch(() => { /* 자동 재생 제한 또는 네트워크 오류 */ });
  };

  return (
    <main className="home">
      <div className="home-content">
        <div className="pokemon-row" aria-label="오늘의 포켓몬 다섯 마리">
          {dailyPokemon.map((id) => {
            const name = pokemonIndex.find((p) => p.id === id)?.name || `${id}번 포켓몬`;
            return (
              <Link
                to={`/pokemon/${id}`}
                key={id}
                className="pokemon-slot"
                title={`${name} · 마우스를 올리면 울음소리가 재생됩니다`}
                aria-label={`${name} 도감 보기`}
                onPointerEnter={(event: { pointerType: string }) => {
                  if (event.pointerType === 'mouse' || event.pointerType === 'pen') playCry(id);
                }}
                onFocus={() => playCry(id)}
              >
                <HomeSprite id={id} />
              </Link>
            );
          })}
        </div>
        <PokemonSearch pokemonIndex={pokemonIndex} loading={loading} error={error} />
      </div>
    </main>
  );
}

function App() {
  const [pokemonIndex, setPokemonIndex] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadPokemonIndex()
      .then((entries) => { if (active) setPokemonIndex(entries); })
      .catch(() => { if (active) setError('도감 데이터 연결에 실패했습니다. 새로고침해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage pokemonIndex={pokemonIndex} loading={loading} error={error} />} />
        <Route path="/pokemon/:id" element={<PokemonDetailPage pokemonIndex={pokemonIndex} loading={loading} searchError={error} />} />
        <Route path="*" element={<HomePage pokemonIndex={pokemonIndex} loading={loading} error={error} />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
