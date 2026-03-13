Write-Host "--- STARTING DEPLOY FIX ---"
git status
Write-Host "--- ADDING ALL FILES ---"
git add -A
Write-Host "--- CHECKING STATUS AFTER ADD ---"
git status
Write-Host "--- COMMITTING ---"
git commit -m "fix: commit all pending changes for ticket module deployment including untracked files"
Write-Host "--- PUSHING TO ORIGIN MAIN ---"
git push origin main
Write-Host "--- DEPLOY FIX COMPLETED ---"
