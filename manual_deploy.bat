@echo off
cd /d D:\PILOTO\VISION
echo --- DIAGNOSTICO E DEPLOY MANUAL ---
echo Diretorio de trabalho: %CD%

if not exist .git (
    echo [ERRO CRITICO] A pasta .git NAO foi encontrada em %CD%
    echo O repositorio parece estar corrompido ou inexistente.
    pause
    exit
)

echo.
echo 1. Verificando bloqueios do Git...
if exist .git\index.lock (
    echo [AVISO] Removendo arquivo de bloqueio .git\index.lock
    del .git\index.lock
)

echo.
echo 2. Verificando status...
git status

echo.
echo 3. Adicionando arquivos...
git add .

echo.
echo 4. Commitando alteracoes...
git commit -m "fix: build error - correct import in new-ticket-dialog"

echo.
echo 5. Enviando para o GitHub (Origin Main)...
git push origin main

echo.
echo --- PROCESSO FINALIZADO ---
echo Verifique se houve erros acima. Se o push foi com sucesso, verifique o painel da Vercel.
pause
