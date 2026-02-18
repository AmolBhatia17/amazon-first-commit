# AWS CLI Configuration Helper
# This script helps you configure AWS CLI with Access Keys

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS CLI Configuration Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To use AWS CLI, you need Access Keys (not email/password)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps to get Access Keys:" -ForegroundColor Cyan
Write-Host "1. Go to: https://console.aws.amazon.com/iam/" -ForegroundColor White
Write-Host "2. Sign in with: motomkar@gmail.com" -ForegroundColor White
Write-Host "3. Click 'Users' in the left menu" -ForegroundColor White
Write-Host "4. Click on your username" -ForegroundColor White
Write-Host "5. Go to 'Security credentials' tab" -ForegroundColor White
Write-Host "6. Scroll to 'Access keys' section" -ForegroundColor White
Write-Host "7. Click 'Create access key'" -ForegroundColor White
Write-Host "8. Choose 'Command Line Interface (CLI)'" -ForegroundColor White
Write-Host "9. Copy the Access Key ID and Secret Access Key" -ForegroundColor White
Write-Host ""
Write-Host "Then run: aws configure" -ForegroundColor Green
Write-Host ""
Write-Host "Or enter them here (they will be stored securely):" -ForegroundColor Yellow
Write-Host ""

$accessKeyId = Read-Host "Enter AWS Access Key ID"
$secretAccessKey = Read-Host "Enter AWS Secret Access Key" -AsSecureString
$region = Read-Host "Enter AWS Region (default: us-east-1)" 
if ([string]::IsNullOrWhiteSpace($region)) { $region = "us-east-1" }
$outputFormat = Read-Host "Enter output format (default: json)"
if ([string]::IsNullOrWhiteSpace($outputFormat)) { $outputFormat = "json" }

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey)
$plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Configuring AWS CLI..." -ForegroundColor Yellow

aws configure set aws_access_key_id $accessKeyId
aws configure set aws_secret_access_key $plainSecret
aws configure set default.region $region
aws configure set default.output $outputFormat

Write-Host ""
Write-Host "Testing configuration..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity
if ($LASTEXITCODE -eq 0) {
    Write-Host "âœ“ AWS CLI configured successfully!" -ForegroundColor Green
    Write-Host $identity
} else {
    Write-Host "âœ— Configuration failed. Please check your credentials." -ForegroundColor Red
}
