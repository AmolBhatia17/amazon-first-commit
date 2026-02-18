# UniTalks AWS Deployment Script
# This script automates the deployment to AWS EC2 + Amplify

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UniTalks AWS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check AWS CLI
Write-Host "[1/10] Checking AWS CLI..." -ForegroundColor Yellow
$awsCmd = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCmd) {
    Write-Host "ERROR: AWS CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Install via: winget install Amazon.AWSCLIV2" -ForegroundColor Yellow
    exit 1
}
Write-Host "âœ“ AWS CLI found" -ForegroundColor Green

# Check AWS configuration
Write-Host "[2/10] Checking AWS configuration..." -ForegroundColor Yellow
$awsConfigured = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS CLI not configured. Please run: aws configure" -ForegroundColor Red
    Write-Host "You'll need:" -ForegroundColor Yellow
    Write-Host "  - AWS Access Key ID" -ForegroundColor Yellow
    Write-Host "  - AWS Secret Access Key" -ForegroundColor Yellow
    Write-Host "  - Default region (e.g., us-east-1)" -ForegroundColor Yellow
    Write-Host "  - Default output format (json)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get Access Keys:" -ForegroundColor Cyan
    Write-Host "1. Go to https://console.aws.amazon.com/iam/" -ForegroundColor Cyan
    Write-Host "2. Click 'Users' -> Your user -> 'Security credentials'" -ForegroundColor Cyan
    Write-Host "3. Click 'Create access key'" -ForegroundColor Cyan
    exit 1
}
Write-Host "âœ“ AWS CLI configured" -ForegroundColor Green
$accountId = (aws sts get-caller-identity --query Account --output text)
$region = (aws configure get region)
Write-Host "  Account ID: $accountId" -ForegroundColor Gray
Write-Host "  Region: $region" -ForegroundColor Gray

Write-Host ""
Write-Host "Starting deployment..." -ForegroundColor Cyan
Write-Host ""
