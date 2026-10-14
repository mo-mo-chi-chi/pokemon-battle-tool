import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import OfficialIcon from './OfficialIcon';
import { TYPE_INFO } from '../data/pokemon';
import { DAMAGE_CLASS, type MoveInfo } from '../data/pokemonDetail';
import { getCachedMoveDescription, preloadMoveDescription, type MoveDescriptionData } from '../data/moveDescriptions';

interface Props { move: { slug: string; info?: MoveInfo; name: string }; onClose: () => void; version: string }
function cleanText(value: string) { return value.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g,' ').trim(); }

export default function MoveDetailModal({ move, onClose, version }: Props) {
  // 마우스를 올렸거나 배경에서 미리 받아놓았다면 첫 프레임부터 설명 표시
  const [data, setData] = useState<MoveDescriptionData | null>(() => getCachedMoveDescription(move.slug));
  const [error, setError] = useState('');
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  useEffect(() => {
    let alive = true;
    setData(getCachedMoveDescription(move.slug));
    setError('');
    void preloadMoveDescription(move.slug).then(result => {
      if (alive) setData(result);
    }).catch(() => {
      if (alive) setError('기술 설명을 불러오지 못했습니다. 다시 열어주세요.');
    });
    return () => { alive = false; };
  }, [move.slug]);
  const info = move.info;
  const type = info?.typeId ? TYPE_INFO[info.typeId] : null;
  const damageKey = info?.damageClass === 2 ? 'physical' : info?.damageClass === 3 ? 'special' : 'status';
  const textKo = data?.flavor_text_entries.find(entry => entry.language.name === 'ko' && entry.version_group.name === version)?.flavor_text
    || [...(data?.flavor_text_entries || [])].reverse().find(entry => entry.language.name === 'ko')?.flavor_text
    || data?.effect_entries.find(entry => entry.language.name === 'ko')?.short_effect;
  const textEn = data?.flavor_text_entries.find(entry => entry.language.name === 'en' && entry.version_group.name === version)?.flavor_text
    || [...(data?.flavor_text_entries || [])].reverse().find(entry => entry.language.name === 'en')?.flavor_text
    || data?.effect_entries.find(entry => entry.language.name === 'en')?.short_effect;
  const description = textKo || textEn;
  return createPortal(
    <div className="dex-modal-backdrop" onMouseDown={(event: { target: EventTarget; currentTarget: EventTarget }) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dex-modal" role="dialog" aria-modal="true" aria-labelledby="dex-modal-name">
        <header className="dex-modal-head"><div><small>기술 상세 정보</small><h2 id="dex-modal-name">{move.name}</h2></div>
          <button type="button" className="dex-modal-close" onClick={onClose} aria-label="닫기">×</button></header>
        <div className="dex-modal-pills">
          {type && <span className="detail2-type" style={{ color:type.color, borderColor:`${type.color}66` }}><OfficialIcon path={type.icon} className="type-icon" />{type.label}</span>}
          <span className="detail2-damage-class"><OfficialIcon path={`seals/gen8/move-${damageKey}.png`} className="detail2-damage-icon" />{DAMAGE_CLASS[info?.damageClass || 1]}</span>
        </div>
        <dl className="dex-modal-stats">
          <div><dt>위력</dt><dd>{info?.power ?? '—'}</dd></div>
          <div><dt>명중률</dt><dd>{info?.accuracy == null ? '—' : `${info.accuracy}%`}</dd></div>
          <div><dt>PP</dt><dd>{info?.pp ?? '—'}</dd></div>
        </dl>
        <div className="dex-modal-desc"><h3>기술 설명</h3>
          {!data && !error ? <p className="dex-move-wait" aria-live="polite">설명 데이터 연결 중…</p> : error ? <p>{error}</p> : description ? <><p>{cleanText(description).replaceAll('$effect_chance',String(data?.effect_chance ?? ''))}</p>{!textKo && <small>PokéAPI에 한국어 설명이 없어 영어 원문을 표시합니다.</small>}</> : <p>PokéAPI에 등록된 기술 설명이 없습니다.</p>}
        </div>
      </section>
    </div>,
    document.body
  );
}
