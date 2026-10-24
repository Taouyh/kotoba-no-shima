@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Please install Node.js 24 LTS and try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing game dependencies...
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Please check your connection and try again.
    pause
    exit /b 1
  )
)
echo Starting Kana Island at http://127.0.0.1:5173
echo Keep this window open while playing. Press Ctrl+C to stop.
call npm run dev -- --open
if errorlevel 1 (
  echo Could not start. If port 5173 is in use, open the existing game window.
  pause
)
endlocal
