$path = "D:\PILOTO\VISION"
Set-Location $path
Write-Host "Checking status..."
git status | Out-File -FilePath "$path\status.txt" -Encoding utf8
Write-Host "Checking log..."
git log -1 | Out-File -FilePath "$path\log_local.txt" -Encoding utf8
Write-Host "Pushing..."
git push origin main 2>&1 | Out-File -FilePath "$path\push_log.txt" -Encoding utf8
Write-Host "Done."
