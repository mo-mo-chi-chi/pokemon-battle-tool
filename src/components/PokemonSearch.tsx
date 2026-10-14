import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import OfficialIcon from './OfficialIcon';
import { getFallbackSpriteUrl, getSpriteUrl, TYPE_INFO, type PokemonEntry } from '../data/pokemon';

type Props = {
  pokemonIndex: PokemonEntry[];
  loading: boolean;
  error?: string;
  compact?: boolean;
};

function SearchSprite({ id }: { id: number }) {
  const [fallback, setFallback] = useState(false);
  return (
    <img
      src={fallback ? getFallbackSpriteUrl(id) : getSpriteUrl(id)}
      onError={() => setFallback(true)}
      className="suggestion-sprite"
      alt=""
      loading="lazy"
      draggable={false}
    />
  );
}

export default function PokemonSearch({ pokemonIndex, loading, error = '', compact = false }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = compact ? 'detail-pokemon-suggestions' : 'home-pokemon-suggestions';

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return pokemonIndex
      .filter((pokemon) => pokemon.name.toLocaleLowerCase().includes(term) || String(pokemon.id).includes(term))
      .sort((a, b) => {
        const score = (pokemon: PokemonEntry) =>
          pokemon.name.toLocaleLowerCase() === term || String(pokemon.id) === term ? 0 :
          pokemon.name.toLocaleLowerCase().startsWith(term) ? 1 : 2;
        return score(a) - score(b) || a.id - b.id;
      })
      .slice(0, 12);
  }, [query, pokemonIndex]);

  const showResults = focused && query.trim().length > 0;

  function selectPokemon(pokemon: PokemonEntry) {
    setQuery('');
    setFocused(false);
    setActiveIndex(0);
    navigate(`/pokemon/${pokemon.id}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = results[activeIndex] ?? results[0];
    if (selected) selectPokemon(selected);
  }

  return (
    <div className={`search-area ${compact ? 'search-area--compact' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}>
      <form className="search-box" role="search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setFocused(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setFocused(false); event.currentTarget.blur(); }
            if (event.key === 'ArrowDown' && results.length) {
              event.preventDefault();
              setActiveIndex((prev) => (prev + 1) % results.length);
            }
            if (event.key === 'ArrowUp' && results.length) {
              event.preventDefault();
              setActiveIndex((prev) => (prev + results.length - 1) % results.length);
            }
          }}
          placeholder={compact ? '포켓몬 이름 · 도감번호 검색' : '포켓몬 이름 또는 전국도감 번호'}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label="포켓몬 검색"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showResults}
          aria-activedescendant={showResults && results.length
            ? `${listId}-${results[Math.min(activeIndex, results.length - 1)].id}`
            : undefined}
        />
        <button type="submit" aria-label="검색">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </button>
      </form>
      {showResults && (
        <div className="suggestions" id={listId} role="listbox" aria-label="검색 결과">
          {loading ? (
            <p className="suggestion-info">도감 데이터를 불러오는 중입니다…</p>
          ) : error ? (
            <p className="suggestion-info error">{error}</p>
          ) : results.length === 0 ? (
            <p className="suggestion-info">일치하는 포켓몬이 없습니다.</p>
          ) : results.map((pokemon, index) => (
            <button
              type="button"
              key={pokemon.id}
              id={`${listId}-${pokemon.id}`}
              className={`suggestion-row ${activeIndex === index ? 'active' : ''}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPokemon(pokemon)}
            >
              <SearchSprite id={pokemon.id} />
              <span className="suggestion-identity">
                <span className="pokedex-number">No. {String(pokemon.id).padStart(4, '0')}</span>
                <strong>{pokemon.name}</strong>
              </span>
              <span className="type-list">
                {pokemon.types.map((typeId) => {
                  const type = TYPE_INFO[typeId];
                  return type ? (
                    <span key={typeId} className="type-badge" style={{ color: type.color, borderColor: `${type.color}75` }}>
                      <OfficialIcon path={type.icon} className="type-icon" />{type.label}
                    </span>
                  ) : null;
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
