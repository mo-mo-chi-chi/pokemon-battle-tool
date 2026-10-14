import { useEffect, useState } from 'react';

type Props = {
  path: string;
  className?: string;
};

/**
 * PokéSprite의 게임 원본 PNG를 /public/pokemon-icons/에서 직접 제공.
 * 외부 CDN을 브라우저에서 호출하지 않습니다.
 * PNG 설치: node scripts/download-icons.mjs
 */
export default function OfficialIcon({ path, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [path]);
  const imagePath = `${import.meta.env.BASE_URL}pokemon-icons/${path.replace(/^\/+/, '')}`;

  // src가 바뀌면 이미지 요소를 다시 마운트해야 하므로 key를 path로 설정.
  if (failed) {
    return (
      <span
        key={`error-${path}`}
        className={className}
        role="img"
        aria-label="아이콘 파일 누락"
        title={`아이콘 파일을 찾지 못했습니다. node scripts/download-icons.mjs 실행: ${path}`}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#ffb359' }}
      >
        ⚠
      </span>
    );
  }

  return (
    <img
      key={path}
      className={className}
      src={imagePath}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      onError={() => {
        console.error(`[포켓몬 아이콘] 로컬 PNG 파일 누락: ${imagePath}`);
        setFailed(true);
      }}
    />
  );
}
