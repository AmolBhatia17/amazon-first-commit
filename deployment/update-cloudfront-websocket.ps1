# Update CloudFront distribution to forward WebSocket headers
$distributionId = "EYKXVQO6U1R98"

Write-Host "Getting current CloudFront distribution config..." -ForegroundColor Yellow
$dist = aws cloudfront get-distribution-config --id $distributionId --output json | ConvertFrom-Json
$etag = $dist.ETag
$config = $dist.DistributionConfig

# Update /ws* cache behavior to forward WebSocket headers
$wsBehavior = $config.CacheBehaviors.Items | Where-Object { $_.PathPattern -eq "/ws*" }
if ($wsBehavior) {
    Write-Host "Updating /ws* cache behavior to forward WebSocket headers..." -ForegroundColor Yellow
    $wsBehavior.ForwardedValues.Headers = @{
        Quantity = 3
        Items = @(
            "Sec-WebSocket-Key",
            "Sec-WebSocket-Version",
            "Sec-WebSocket-Protocol"
        )
    }
    Write-Host "✅ WebSocket headers configured" -ForegroundColor Green
} else {
    Write-Host "❌ /ws* cache behavior not found!" -ForegroundColor Red
    exit 1
}

# Save updated config
$configJson = $config | ConvertTo-Json -Depth 10
$tempFile = "$env:TEMP\cloudfront-updated-$(Get-Random).json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempFile, $configJson, $utf8NoBom)

Write-Host "Updating CloudFront distribution..." -ForegroundColor Yellow
Write-Host "Note: This may take 10-15 minutes to deploy" -ForegroundColor Gray

$result = aws cloudfront update-distribution --id $distributionId --distribution-config "file://$tempFile" --if-match $etag --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CloudFront distribution updated successfully!" -ForegroundColor Green
    Write-Host "⚠️  Distribution is deploying (takes 10-15 minutes)" -ForegroundColor Yellow
    Write-Host "   Check status: aws cloudfront get-distribution --id $distributionId" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to update CloudFront distribution" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
}

Remove-Item $tempFile -ErrorAction SilentlyContinue
