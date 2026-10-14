@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 포켓몬 공식 타입/기술분류 아이콘 다운로드
node scripts\download-icons.mjs
pause
