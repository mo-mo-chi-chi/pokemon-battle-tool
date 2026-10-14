/**
 * PokéSprite의 실제 게임 UI PNG(18 타입 + 3 기술 분류)를 다운로드합니다.
 * 실행: node scripts/download-icons.mjs
 * Node.js 20 이상 (Vite 8 구동 환경)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = join(projectRoot, 'public', 'pokemon-icons');
const typeNames = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock',
  'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric',
  'psychic', 'ice', 'dragon', 'dark', 'fairy',
];
const paths = [
  ...typeNames.map((name) => `types/gen8/${name}.png`),
  'seals/gen8/move-physical.png',
  'seals/gen8/move-special.png',
  'seals/gen8/move-status.png',
];

// 우선순위대로 순회; 파일이 404이거나 응답이 PNG가 아니면 다음 서버로 재시도.
const sources = [
  'https://raw.githubusercontent.com/msikma/pokesprite/master/misc/',
  'https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/misc/',
  'https://github.com/msikma/pokesprite/raw/refs/heads/master/misc/',
];
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(bytes) {
  return bytes.length > 60 && bytes.subarray(0, 8).equals(PNG_MAGIC);
}

async function downloadOne(path) {
  const output = join(targetRoot, ...path.split('/'));
  try {
    if (isPng(await readFile(output))) {
      console.log(` ✓ 보유  ${path}`);
      return true;
    }
  } catch { /* 처음 설치하는 파일 */ }

  let lastError = '알 수 없는 오류';
  for (const source of sources) {
    try {
      const response = await fetch(source + path, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'pokemon-battle-tool (icon setup)' },
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status} ${source}`;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!isPng(buffer)) {
        lastError = `PNG 형식이 아닌 응답 (${source})`;
        continue;
      }
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, buffer);
      console.log(` ✓ 저장  ${path}`);
      return true;
    } catch (err) {
      lastError = `${err?.message || String(err)} (${source})`;
    }
  }
  console.error(` ✗ 실패  ${path}: ${lastError}`);
  return false;
}

async function main() {
  console.log('PokéSprite 공식 게임 이미지 21개 내려받기');
  console.log(`저장 위치: ${targetRoot}\n`);
  const failures = [];
  // 과도한 동시 요청 방지. 4개씩 다운로드.
  for (let offset = 0; offset < paths.length; offset += 4) {
    const batch = paths.slice(offset, offset + 4);
    const results = await Promise.all(batch.map(downloadOne));
    results.forEach((ok, index) => { if (!ok) failures.push(batch[index]); });
  }
  if (failures.length) {
    console.error(`\n${paths.length - failures.length}/${paths.length}개 완료, ${failures.length}개 실패`);
    console.error('인터넷·GitHub 차단 여부를 확인한 뒤 같은 명령을 다시 실행하세요.');
    console.error('실패한 항목: ' + failures.join(', '));
    process.exitCode = 1;
  } else {
    console.log(`\n완료: ${paths.length}/${paths.length}개 PNG 파일이 정상 저장되었습니다.`);
    console.log('브라우저 Ctrl + Shift + R 새로고침으로 확인하세요.');
  }
}

await main();
