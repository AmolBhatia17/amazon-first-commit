# Automated AWS Deployment - Complete Setup
$awsExe = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UniTalks AWS Deployment - Automated" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1] Checking AWS CLI configuration..." -ForegroundColor Yellow
$identityOutput = & $awsExe sts get-caller-identity 2>&1
if ($LASTEXITCODE -eq 0) {
    $identity = $identityOutput | ConvertFrom-Json
    Write-Host "AWS CLI already configured" -ForegroundColor Green
    Write-Host "  Account: $($identity.Account)" -ForegroundColor Gray
} else {
    Write-Host "AWS CLI not configured. Need Access Keys." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get Access Keys:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://console.aws.amazon.com/iam/home#/users" -ForegroundColor White
    Write-Host "2. Sign in with your AWS account" -ForegroundColor White
    Write-Host "3. Click your username -> Security credentials" -ForegroundColor White
    Write-Host "4. Create access key -> CLI" -ForegroundColor White
    Write-Host ""
    
    $accessKeyId = Read-Host "Enter AWS Access Key ID"
    $secretAccessKey = Read-Host "Enter AWS Secret Access Key" -AsSecureString
    $region = Read-Host "Enter AWS Region (default: us-east-1)"
    if ([string]::IsNullOrWhiteSpace($region)) { $region = "us-east-1" }
    
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey)
    $plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    Write-Host "Configuring AWS CLI..." -ForegroundColor Yellow
    & $awsExe configure set aws_access_key_id $accessKeyId
    & $awsExe configure set aws_secret_access_key $plainSecret
    & $awsExe configure set default.region $region
    & $awsExe configure set default.output json
    
    $plainSecret = $null
    [System.GC]::Collect()
    
    $identityOutput = & $awsExe sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "AWS CLI configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "Configuration failed!" -ForegroundColor Red
        exit 1
    }
}

$accountId = (& $awsExe sts get-caller-identity --query Account --output text)
$region = (& $awsExe configure get region)
if ([string]::IsNullOrWhiteSpace($region)) {
    $region = "us-east-1"
    & $awsExe configure set default.region $region
}

Write-Host ""
Write-Host "Starting deployment..." -ForegroundColor Cyan
Write-Host "Account ID: $accountId" -ForegroundColor Gray
Write-Host "Region: $region" -ForegroundColor Gray
Write-Host ""

& "$PSScriptRoot\deploy-complete.ps1" -Region $region