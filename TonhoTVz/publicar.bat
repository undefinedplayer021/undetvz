@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Baixe em https://nodejs.org ^(versao LTS^), instale e rode este arquivo de novo.
  pause
  exit /b
)
echo Publicando no Netlify...
echo Na primeira vez ele abre o navegador para entrar na sua conta e pergunta qual site usar.
echo.
call npx -y netlify-cli deploy --prod
echo.
pause
