@echo off
chcp 65001 >nul
title 기계공학 튜터 서버
rem 더블클릭 실행용: 패키지 확인 -> 빌드 -> 서버 실행(준비되면 브라우저 자동 열기)
rem 이 창을 닫으면 서버가 종료됩니다.

cd /d "%~dp0"
set "APP_URL=http://localhost:3001"

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 LTS 버전을 설치하세요.
  pause
  exit /b 1
)

rem 이미 실행 중이면 브라우저만 연다. (Windows 10 이상에 기본 포함된 curl 사용)
curl -s -f -o nul --max-time 2 "%APP_URL%/api/config" >nul 2>nul
if not errorlevel 1 (
  echo 이미 실행 중입니다. 브라우저를 엽니다.
  start "" "%APP_URL%"
  exit /b 0
)

if not exist "node_modules\" (
  echo 처음 실행: 필요한 패키지를 설치합니다. 1~2분 걸릴 수 있습니다...
  call npm install
  if errorlevel 1 (
    echo [오류] 패키지 설치에 실패했습니다. 위 메시지를 확인하세요.
    pause
    exit /b 1
  )
)

echo 화면 파일을 준비합니다...
call npm run build
if errorlevel 1 (
  echo [오류] 빌드에 실패했습니다. 위 메시지를 확인하세요.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  잠시 후 브라우저가 열립니다: %APP_URL%
echo  이 창을 닫으면 앱이 종료됩니다.
echo ============================================
echo.
set "OPEN_BROWSER=1"
node server/index.js
echo.
echo 서버가 종료되었습니다. 위에 오류가 있다면 확인하세요.
pause
