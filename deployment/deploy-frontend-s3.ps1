# Frontend Deployment Script for S3 + CloudFront
# Prerequisites: IAM user must have S3 and CloudFront permissions

Write-Host "=== Frontend Deployment to S3 ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Configuration
$region = "us-east-1"
$bucketName = "unitalks-frontend-278513763034"
$backendUrl = "http://44.202.124.228:8080"

# Step 1: Build React app
Write-Host "Step 1: Building React application..." -ForegroundColor Yellow
$env:REACT_APP_API_URL = $backendUrl
Set-Location $PSScriptRoot\..
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green
Write-Host ""

# Step 2: Create S3 bucket (if doesn't exist)
Write-Host "Step 2: Creating S3 bucket..." -ForegroundColor Yellow
$bucketExists = aws s3 ls "s3://$bucketName" --region $region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating bucket: $bucketName" -ForegroundColor Gray
    aws s3 mb "s3://$bucketName" --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create bucket. Check IAM permissions." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Bucket created" -ForegroundColor Green
} else {
    Write-Host "✅ Bucket already exists" -ForegroundColor Green
}
Write-Host ""

# Step 3: Upload files
Write-Host "Step 3: Uploading build files..." -ForegroundColor Yellow
aws s3 sync ./build "s3://$bucketName" --delete --region $region
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files uploaded" -ForegroundColor Green
Write-Host ""

# Step 4: Enable static website hosting
Write-Host "Step 4: Enabling static website hosting..." -ForegroundColor Yellow
$websiteConfig = @{
    IndexDocument = @{ Suffix = "index.html" }
    ErrorDocument = @{ Key = "index.html" }
} | ConvertTo-Json -Compress

$websiteConfig | Out-File -FilePath "$env:TEMP\s3-website.json" -Encoding UTF8 -NoNewline
aws s3api put-bucket-website --bucket $bucketName --website-configuration "file://$env:TEMP\s3-website.json" --region $region
Write-Host "✅ Website hosting enabled" -ForegroundColor Green
Write-Host ""

# Step 5: Set bucket policy for public access
Write-Host "Step 5: Setting bucket policy..." -ForegroundColor Yellow
$bucketPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid = "PublicReadGetObject"
            Effect = "Allow"
            Principal = "*"
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::$bucketName/*"
        }
    )
} | ConvertTo-Json -Depth 10

$bucketPolicy | Out-File -FilePath "$env:TEMP\s3-policy.json" -Encoding UTF8 -NoNewline
aws s3api put-bucket-policy --bucket $bucketName --policy "file://$env:TEMP\s3-policy.json" --region $region
Write-Host "✅ Bucket policy set" -ForegroundColor Green
Write-Host ""

# Step 6: Display website URL
$websiteUrl = "http://$bucketName.s3-website-$region.amazonaws.com"
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL: $websiteUrl" -ForegroundColor Cyan
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Update REACT_APP_API_URL in your frontend code to use HTTPS if needed." -ForegroundColor Yellow
