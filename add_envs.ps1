$vars = @{
    "DATABASE_URL" = "postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
    "RESEND_API_KEY" = "re_L8KVHoqM_GKNjbvENshyLUGW95WumGDtL"
    "NEXT_PUBLIC_APP_URL" = "https://vision-beta-one.vercel.app"
    "EMAIL_FROM" = "VISION <naoresponda@nzdcontabilidade.com.br>"
    "R2_ACCOUNT_ID" = "20e04ed7324d0b3ac8eec058618a1e0a"
    "R2_ACCESS_KEY_ID" = "73742a582ce3cca911110a51073ab1e9"
    "R2_SECRET_ACCESS_KEY" = "3d6f93a7bba8ff2e9383696e79f7b83bfba4671a3e45ce952cba7f1d1e74ed54"
    "R2_BUCKET_NAME" = "admissao-files"
}

foreach ($key in $vars.Keys) {
    Write-Output "Adding $key..."
    $val = $vars[$key]
    $val | npx vercel env add $key production
}
