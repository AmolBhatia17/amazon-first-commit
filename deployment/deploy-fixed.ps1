# UniTalks AWS Deployment Script - Fixed Version
param(
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$awsExe = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UniTalks AWS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get Account ID
Write-Host "[1/12] Getting AWS Account..." -ForegroundColor Yellow
$accountId = (& $awsExe sts get-caller-identity --query Account --output text)
Write-Host "Account ID: $accountId" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host ""

# Generate JWT Secret
Write-Host "[2/12] Generating JWT Secret..." -ForegroundColor Yellow
$JWTSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "JWT Secret generated" -ForegroundColor Green
Write-Host ""

# Create ECR Repository
Write-Host "[3/12] Creating ECR repository..." -ForegroundColor Yellow
$ecrRepo = "unitalks-backend"
$ecrCheck = & $awsExe ecr describe-repositories --repository-names $ecrRepo --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating ECR repository..." -ForegroundColor Gray
    & $awsExe ecr create-repository --repository-name $ecrRepo --region $Region | Out-Null
    Write-Host "ECR repository created" -ForegroundColor Green
} else {
    Write-Host "ECR repository already exists" -ForegroundColor Green
}
$ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com/$ecrRepo"
Write-Host "ECR URI: $ecrUri" -ForegroundColor Gray
Write-Host ""

# Check Docker
Write-Host "[4/12] Checking Docker..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "Docker found - will build and push image" -ForegroundColor Green
} else {
    Write-Host "Docker not found - you'll need to build image manually" -ForegroundColor Yellow
}
Write-Host ""

# Create Key Pair
Write-Host "[5/12] Creating EC2 Key Pair..." -ForegroundColor Yellow
$keyPairName = "unitalks-keypair"
$keyPairCheck = & $awsExe ec2 describe-key-pairs --key-names $keyPairName --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating key pair..." -ForegroundColor Gray
    $keyPair = & $awsExe ec2 create-key-pair --key-name $keyPairName --region $Region --query 'KeyMaterial' --output text
    $keyPair | Out-File -FilePath "$keyPairName.pem" -Encoding ASCII -NoNewline
    Write-Host "Key pair created: $keyPairName.pem" -ForegroundColor Green
} else {
    Write-Host "Key pair already exists" -ForegroundColor Green
}
Write-Host ""

# Get VPC and Subnet
Write-Host "[6/12] Getting VPC configuration..." -ForegroundColor Yellow
$vpc = & $awsExe ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $Region --query 'Vpcs[0].VpcId' --output text
$subnet = & $awsExe ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --region $Region --query 'Subnets[0].SubnetId' --output text
Write-Host "VPC: $vpc, Subnet: $subnet" -ForegroundColor Gray
Write-Host ""

# Create Security Group
Write-Host "[7/12] Creating Security Group..." -ForegroundColor Yellow
$sgName = "unitalks-backend-sg"
$sgCheck = & $awsExe ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --region $Region --query 'SecurityGroups[0].GroupId' --output text 2>&1
if ([string]::IsNullOrWhiteSpace($sgCheck) -or $sgCheck -eq "None") {
    $sgId = & $awsExe ec2 create-security-group --group-name $sgName --description "UniTalks Backend Security Group" --vpc-id $vpc --region $Region --query 'GroupId' --output text
    & $awsExe ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region | Out-Null
    & $awsExe ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8080 --cidr 0.0.0.0/0 --region $Region | Out-Null
    Write-Host "Security group created: $sgId" -ForegroundColor Green
} else {
    $sgId = $sgCheck
    Write-Host "Security group already exists: $sgId" -ForegroundColor Green
}
Write-Host ""

# Get AMI
Write-Host "[8/12] Getting Ubuntu AMI..." -ForegroundColor Yellow
$amiId = & $awsExe ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' --output text --region $Region
Write-Host "AMI ID: $amiId" -ForegroundColor Gray
Write-Host ""

# Launch EC2 Instance
Write-Host "[9/12] Launching EC2 instance..." -ForegroundColor Yellow
$userDataScript = @"
#!/bin/bash
apt-get update -y
apt-get install -y docker.io awscli
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu
sleep 10
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
docker pull $ecrUri`:latest
docker run -d --name unitalks-backend --restart unless-stopped -p 8080:8080 -e JWT_SECRET=$JWTSecret -e PORT=8080 -e NODE_ENV=production $ecrUri`:latest
"@

$userDataBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userDataScript))
$tagSpec = "ResourceType=instance,Tags=[{Key=Name,Value=unitalks-backend}]"

$instanceJson = & $awsExe ec2 run-instances `
    --image-id $amiId `
    --instance-type t2.micro `
    --key-name $keyPairName `
    --security-group-ids $sgId `
    --subnet-id $subnet `
    --user-data $userDataBase64 `
    --tag-specifications $tagSpec `
    --region $Region `
    --query 'Instances[0]' `
    --output json | ConvertFrom-Json

$instanceId = $instanceJson.InstanceId
Write-Host "EC2 instance launched: $instanceId" -ForegroundColor Green

# Wait for instance
Write-Host "Waiting for instance to be running..." -ForegroundColor Gray
& $awsExe ec2 wait instance-running --instance-ids $instanceId --region $Region
Start-Sleep -Seconds 15

$publicIp = & $awsExe ec2 describe-instances --instance-ids $instanceId --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
Write-Host "Instance is running. Public IP: $publicIp" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "[10/12] Deployment Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend EC2 Instance:" -ForegroundColor Green
Write-Host "  Instance ID: $instanceId" -ForegroundColor White
Write-Host "  Public IP: $publicIp" -ForegroundColor White
Write-Host "  Health Check: http://$publicIp`:8080/health" -ForegroundColor White
Write-Host ""
Write-Host "ECR Repository: $ecrUri" -ForegroundColor White
Write-Host "Key Pair: $keyPairName.pem" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Build and push Docker image to ECR (if not done)" -ForegroundColor White
Write-Host "2. Wait 2-3 minutes for backend to be ready" -ForegroundColor White
Write-Host "3. Test: curl http://$publicIp`:8080/health" -ForegroundColor White
Write-Host "4. Set up Amplify frontend with REACT_APP_API_URL=http://$publicIp`:8080" -ForegroundColor White
