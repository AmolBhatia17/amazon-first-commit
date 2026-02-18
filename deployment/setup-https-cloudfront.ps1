# Setup HTTPS with CloudFront for Frontend
# Prerequisites: IAM user needs CloudFront permissions

param(
    [string]$BucketName = "unitalks-frontend-20260218221428",
    [string]$Region = "us-east-1"
)

Write-Host "=== Setting up HTTPS with CloudFront ===" -ForegroundColor Cyan
Write-Host ""

$s3WebsiteEndpoint = "$BucketName.s3-website-$Region.amazonaws.com"
Write-Host "S3 Website Endpoint: $s3WebsiteEndpoint" -ForegroundColor Gray
Write-Host ""

# Create CloudFront distribution config
$callerRef = "unitalks-frontend-$(Get-Date -Format 'yyyyMMddHHmmss')"
$distributionConfig = @{
    CallerReference = $callerRef
    Comment = "UniTalks Frontend HTTPS Distribution"
    DefaultRootObject = "index.html"
    Origins = @{
        Quantity = 1
        Items = @(
            @{
                Id = "S3-unitalks-frontend"
                DomainName = $s3WebsiteEndpoint
                CustomOriginConfig = @{
                    HTTPPort = 80
                    HTTPSPort = 443
                    OriginProtocolPolicy = "http-only"
                    OriginSslProtocols = @{
                        Quantity = 1
                        Items = @("TLSv1.2")
                    }
                }
            }
        )
    }
    DefaultCacheBehavior = @{
        TargetOriginId = "S3-unitalks-frontend"
        ViewerProtocolPolicy = "redirect-to-https"
        AllowedMethods = @{
            Quantity = 2
            Items = @("GET", "HEAD")
            CachedMethods = @{
                Quantity = 2
                Items = @("GET", "HEAD")
            }
        }
        Compress = $true
        ForwardedValues = @{
            QueryString = $false
            Cookies = @{
                Forward = "none"
            }
        }
        MinTTL = 0
        DefaultTTL = 86400
        MaxTTL = 31536000
    }
    Enabled = $true
    PriceClass = "PriceClass_100"
}

$configJson = $distributionConfig | ConvertTo-Json -Depth 10
$tempFile = "$env:TEMP\cloudfront-config-$(Get-Random).json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempFile, $configJson, $utf8NoBom)

Write-Host "Creating CloudFront distribution..." -ForegroundColor Yellow
Write-Host "Note: This may take 10-15 minutes to deploy" -ForegroundColor Gray
Write-Host ""

$result = aws cloudfront create-distribution --distribution-config "file://$tempFile" --region $Region 2>&1

if ($LASTEXITCODE -eq 0) {
    $distribution = $result | ConvertFrom-Json
    $distributionId = $distribution.Distribution.Id
    $domainName = $distribution.Distribution.DomainName
    $httpsUrl = "https://$domainName"
    
    Write-Host "✅ CloudFront distribution created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Distribution ID: $distributionId" -ForegroundColor Cyan
    Write-Host "HTTPS URL: $httpsUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️ IMPORTANT: Distribution is deploying (takes 10-15 minutes)" -ForegroundColor Yellow
    Write-Host "   Check status: aws cloudfront get-distribution --id $distributionId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Once deployed, use this HTTPS URL for your frontend:" -ForegroundColor Green
    Write-Host "   $httpsUrl" -ForegroundColor White
} else {
    Write-Host "❌ Failed to create CloudFront distribution" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure your IAM user has CloudFrontFullAccess permission" -ForegroundColor Yellow
}
