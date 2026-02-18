# Complete AWS Deployment Script for UniTalks
# Deploys Backend to EC2 and Frontend to Amplify

param(
    [string]$JWTSecret = "",
    [string]$Region = "us-east-1",
    [string]$InstanceType = "t2.micro",
    [string]$KeyPairName = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UniTalks Complete AWS Deployment" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check AWS CLI
Write-Host "[1/12] Checking AWS CLI..." -ForegroundColor Yellow
$awsCmd = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCmd) {
    Write-Host "ERROR: AWS CLI not found!" -ForegroundColor Red
    Write-Host "Installing AWS CLI..." -ForegroundColor Yellow
    winget install Amazon.AWSCLIV2
    Write-Host "Please restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "âœ“ AWS CLI found" -ForegroundColor Green

# Step 2: Check AWS Configuration
Write-Host "[2/12] Checking AWS configuration..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    $accountId = $identity.Account
    Write-Host "âœ“ AWS CLI configured" -ForegroundColor Green
    Write-Host "  Account ID: $accountId" -ForegroundColor Gray
    Write-Host "  User ARN: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "âœ— AWS CLI not configured!" -ForegroundColor Red
    Write-Host "Run: .\configure-aws.ps1" -ForegroundColor Yellow
    Write-Host "Or: aws configure" -ForegroundColor Yellow
    exit 1
}

# Get region
if ([string]::IsNullOrWhiteSpace($Region)) {
    $Region = aws configure get region
    if ([string]::IsNullOrWhiteSpace($Region)) {
        $Region = "us-east-1"
        aws configure set default.region $Region
    }
}
Write-Host "  Region: $Region" -ForegroundColor Gray

# Step 3: Generate JWT Secret if not provided
Write-Host "[3/12] Setting up JWT Secret..." -ForegroundColor Yellow
if ([string]::IsNullOrWhiteSpace($JWTSecret)) {
    $JWTSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    Write-Host "âœ“ Generated secure JWT secret" -ForegroundColor Green
} else {
    Write-Host "âœ“ Using provided JWT secret" -ForegroundColor Green
}

# Step 4: Create ECR Repository
Write-Host "[4/12] Creating ECR repository..." -ForegroundColor Yellow
$ecrRepo = "unitalks-backend"
try {
    aws ecr describe-repositories --repository-names $ecrRepo --region $Region 2>&1 | Out-Null
    Write-Host "âœ“ ECR repository already exists" -ForegroundColor Green
} catch {
    Write-Host "Creating ECR repository..." -ForegroundColor Gray
    aws ecr create-repository --repository-name $ecrRepo --region $Region | Out-Null
    Write-Host "âœ“ ECR repository created" -ForegroundColor Green
}
$ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com/$ecrRepo"

# Step 5: Build and Push Docker Image (if Docker is available)
Write-Host "[5/12] Building Docker image..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "Docker found, building image..." -ForegroundColor Gray
    Set-Location ..\server
    docker build -t $ecrRepo:latest .
    
    Write-Host "Logging into ECR..." -ForegroundColor Gray
    $loginCmd = aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
    if ($LASTEXITCODE -ne 0) {
        Write-Host "âœ— Failed to login to ECR" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Tagging and pushing image..." -ForegroundColor Gray
    docker tag $ecrRepo:latest "$ecrUri`:latest"
    docker push "$ecrUri`:latest"
    Write-Host "âœ“ Docker image pushed to ECR" -ForegroundColor Green
    Set-Location ..\deployment
} else {
    Write-Host "âš  Docker not found. Skipping image build." -ForegroundColor Yellow
    Write-Host "  You'll need to build and push the image manually:" -ForegroundColor Yellow
    Write-Host "  cd ..\server" -ForegroundColor Gray
    Write-Host "  docker build -t $ecrRepo:latest ." -ForegroundColor Gray
    Write-Host "  aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri" -ForegroundColor Gray
    Write-Host "  docker tag $ecrRepo:latest `"$ecrUri`:latest`"" -ForegroundColor Gray
    Write-Host "  docker push `"$ecrUri`:latest`"" -ForegroundColor Gray
}

# Step 6: Create EC2 Key Pair if needed
Write-Host "[6/12] Setting up EC2 Key Pair..." -ForegroundColor Yellow
if ([string]::IsNullOrWhiteSpace($KeyPairName)) {
    $KeyPairName = "unitalks-keypair"
}
$keyPairExists = aws ec2 describe-key-pairs --key-names $KeyPairName --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating key pair: $KeyPairName" -ForegroundColor Gray
    $keyPair = aws ec2 create-key-pair --key-name $KeyPairName --region $Region --query 'KeyMaterial' --output text
    $keyPair | Out-File -FilePath "$KeyPairName.pem" -Encoding ASCII -NoNewline
    Write-Host "âœ“ Key pair created and saved to $KeyPairName.pem" -ForegroundColor Green
    Write-Host "  âš  IMPORTANT: Save this file securely! You'll need it to SSH into EC2." -ForegroundColor Yellow
} else {
    Write-Host "âœ“ Key pair already exists" -ForegroundColor Green
}

# Step 7: Get VPC and Subnet
Write-Host "[7/12] Getting VPC configuration..." -ForegroundColor Yellow
$vpc = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $Region --query 'Vpcs[0].VpcId' --output text
$subnet = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --region $Region --query 'Subnets[0].SubnetId' --output text
Write-Host "âœ“ Using VPC: $vpc, Subnet: $subnet" -ForegroundColor Green

# Step 8: Create Security Group
Write-Host "[8/12] Creating Security Group..." -ForegroundColor Yellow
$sgName = "unitalks-backend-sg"
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --region $Region --query 'SecurityGroups[0].GroupId' --output text 2>&1
if ([string]::IsNullOrWhiteSpace($sgId) -or $sgId -eq "None") {
    $sgId = aws ec2 create-security-group --group-name $sgName --description "UniTalks Backend Security Group" --vpc-id $vpc --region $Region --query 'GroupId' --output text
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8080 --cidr 0.0.0.0/0 --region $Region | Out-Null
    Write-Host "âœ“ Security group created: $sgId" -ForegroundColor Green
} else {
    Write-Host "âœ“ Security group already exists: $sgId" -ForegroundColor Green
}

# Step 9: Launch EC2 Instance
Write-Host "[9/12] Launching EC2 instance..." -ForegroundColor Yellow
$instanceName = "unitalks-backend"
$amiId = aws ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' --output text --region $Region

Write-Host "Using AMI: $amiId" -ForegroundColor Gray

$userData = @"
#!/bin/bash
apt-get update
apt-get install -y docker.io awscli
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
docker pull `$ecrUri`:latest
docker run -d --name unitalks-backend --restart unless-stopped -p 8080:8080 -e JWT_SECRET=$JWTSecret -e PORT=8080 -e NODE_ENV=production `$ecrUri`:latest
"@

$userDataBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userData))

$instanceJson = aws ec2 run-instances `
    --image-id $amiId `
    --instance-type $InstanceType `
    --key-name $KeyPairName `
    --security-group-ids $sgId `
    --subnet-id $subnet `
    --user-data $userDataBase64 `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$instanceName}]" `
    --region $Region `
    --query 'Instances[0]' `
    --output json | ConvertFrom-Json

$instanceId = $instanceJson.InstanceId
Write-Host "âœ“ EC2 instance launched: $instanceId" -ForegroundColor Green

# Wait for instance to be running
Write-Host "Waiting for instance to be running..." -ForegroundColor Gray
aws ec2 wait instance-running --instance-ids $instanceId --region $Region
Start-Sleep -Seconds 10

$publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
Write-Host "âœ“ Instance is running. Public IP: $publicIp" -ForegroundColor Green

# Step 10: Wait for backend to be ready
Write-Host "[10/12] Waiting for backend to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false
while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 10
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://$publicIp`:8080/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $ready = $true
            Write-Host "âœ“ Backend is ready!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    }
}

if (-not $ready) {
    Write-Host "âš  Backend not ready yet. You may need to check manually." -ForegroundColor Yellow
}

# Step 11: Create Amplify App
Write-Host "[11/12] Setting up Amplify..." -ForegroundColor Yellow
Write-Host "âš  Amplify app creation requires manual steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://console.aws.amazon.com/amplify" -ForegroundColor Cyan
Write-Host "2. Click 'New app' -> 'Host web app'" -ForegroundColor Cyan
Write-Host "3. Connect your Git repository" -ForegroundColor Cyan
Write-Host "4. Set environment variables:" -ForegroundColor Cyan
Write-Host "   REACT_APP_API_URL=http://$publicIp`:8080" -ForegroundColor White
Write-Host "   REACT_APP_WEB3FORMS_KEY=your-key-here" -ForegroundColor White
Write-Host "5. Deploy" -ForegroundColor Cyan

# Step 12: Summary
Write-Host ""
Write-Host "[12/12] Deployment Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:" -ForegroundColor Green
Write-Host "  Instance ID: $instanceId" -ForegroundColor White
Write-Host "  Public IP: $publicIp" -ForegroundColor White
Write-Host "  Health Check: http://$publicIp`:8080/health" -ForegroundColor White
Write-Host ""
Write-Host "ECR Repository: $ecrUri" -ForegroundColor White
Write-Host "Key Pair: $KeyPairName.pem" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Amplify environment variable REACT_APP_API_URL" -ForegroundColor White
Write-Host "2. Once Amplify is deployed, update backend CORS_ORIGIN" -ForegroundColor White
Write-Host "3. Test the application" -ForegroundColor White
Write-Host ""
Write-Host "To SSH into EC2:" -ForegroundColor Cyan
Write-Host "  ssh -i $KeyPairName.pem ubuntu@$publicIp" -ForegroundColor White
