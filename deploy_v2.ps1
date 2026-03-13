$logPath = "D:\PILOTO\VISION"
$statusFile = "$logPath\deploy_status.txt"
$pushFile = "$logPath\deploy_push.txt"
$hashFile = "$logPath\deploy_hash.txt"

Write-Host "--- INICIANDO DEPLOY V2 ---"

# 1. Status antes
git status | Out-File -FilePath $statusFile -Encoding utf8

# 2. Configurar usuario (caso nao exista, para evitar erro de commit)
git config user.email "deploy@vision.com"
git config user.name "Vision Deploy"

# 3. Adicionar tudo
git add .

# 4. Commit
git commit -m "fix: implement multi-file upload for tickets and force deploy"

# 5. Push com captura de erro
git push origin main 2>&1 | Out-File -FilePath $pushFile -Encoding utf8

# 6. Gravar novo hash
git rev-parse HEAD | Out-File -FilePath $hashFile -Encoding utf8

Write-Host "--- FIM DEPLOY V2 ---"
