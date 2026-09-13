# UniTalks — AWS Deployment Runbook

Target architecture:

```
unitalks.in ──► Route 53 ──► CloudFront ──┬─ default ──► S3 (React build, private + OAC)
                                          ├─ /api/*  ──► EC2 #1  (Node signaling, Docker, :80→:8080)
                                          └─ /ws*    ──► EC2 #1
turn.unitalks.in ─────────────────────────► EC2 #2  (coturn, 3478 TCP/UDP)
```

Region is **us-east-1** everywhere — CloudFront only accepts an ACM cert from that region.

> **Run everything from one PowerShell window** in the repo root. The `$VARS` below live in
> that session; if you close it you lose them and have to look the IDs back up.
>
> **Three gotchas on this machine already worked around below — don't "simplify" them:**
> 1. `Set-Content -Encoding utf8` writes a UTF-8 **BOM**, and AWS CLI rejects BOM'd JSON with
>    `Error parsing parameter: Expected: '=', received: '﻿'`. Every JSON file here is
>    written with `[IO.File]::WriteAllText(...)`, which omits the BOM.
> 2. `ConvertTo-Json -AsArray` does not exist in PowerShell 5.1 — arrays are built by hand.
> 3. **`C:\Windows\System32\cmd.exe` is missing on this machine** (only the 32-bit copy in
>    `SysWOW64` survives), so `npm` cannot spawn a shell and every `npm ci` / `npm run build`
>    dies with `npm error enoent spawn C:\WINDOWS\system32\cmd.exe`. Run this **once per
>    PowerShell session** before any npm command:
>
>    ```powershell
>    $env:ComSpec = "C:\Windows\SysWOW64\cmd.exe"
>    ```
>
>    Worth repairing properly at some point — `sfc /scannow` from an elevated prompt, or
>    check whether antivirus quarantined it.

---

## Phase 0 — Prerequisites

### 0.0 CloudFront account verification — do this FIRST, it has a lead time

A new AWS account cannot create CloudFront distributions until Support enables it:

```
AccessDenied: Your account must be verified before you can add new CloudFront
resources. To verify your account, please contact AWS Support.
```

Nothing in Phases 1–9 is affected, but Phase 10 is a hard stop until it clears, so raise
the case before you start. Console → Support → **Create case** → *Account and billing* →
Service **CloudFront**, Category *General guidance* — ask them to enable CloudFront
distribution creation. This is free on Basic support; the Support **API** is not (it
returns `SubscriptionRequiredException`), so it must be done in the console.

### 0.1 Create the deploy credentials (you, in the browser)

IAM → Users → your user → Security credentials → **Create access key** → *Command Line Interface*.
Attach **AdministratorAccess** to that user, or the narrower set:
`AmazonS3FullAccess`, `CloudFrontFullAccess`, `AmazonEC2FullAccess`,
`AmazonEC2ContainerRegistryFullAccess`, `AWSCertificateManagerFullAccess`,
`AmazonRoute53FullAccess`, `AmazonSSMFullAccess`, plus `iam:CreateRole`, `iam:PassRole`,
`iam:AttachRolePolicy`, `iam:PutRolePolicy`, `iam:CreateInstanceProfile`.

### 0.2 Configure the CLI

```powershell
aws configure --profile unitalks
# AWS Access Key ID:     <paste>
# AWS Secret Access Key: <paste>
# Default region name:   us-east-1
# Default output format: json
```

### 0.3 Activate and confirm

```powershell
$env:AWS_PROFILE = "unitalks"
$env:AWS_DEFAULT_REGION = "us-east-1"
aws sts get-caller-identity
```

### 0.4 Session variables

```powershell
$ACCOUNT  = (aws sts get-caller-identity --query Account --output text)
$REGION   = "us-east-1"
$DOMAIN   = "unitalks.in"
$BUCKET   = "unitalks-frontend-$ACCOUNT"
$ECR_REPO = "unitalks-backend"
$IMAGE    = "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/${ECR_REPO}:latest"
"ACCOUNT=$ACCOUNT  BUCKET=$BUCKET  IMAGE=$IMAGE"
```

---

## Phase 1 — Route 53 hosted zone

```powershell
$ZONE_ID = (aws route53 create-hosted-zone `
  --name $DOMAIN `
  --caller-reference "unitalks-$(Get-Date -Format yyyyMMddHHmmss)" `
  --query 'HostedZone.Id' --output text).Split('/')[-1]
$ZONE_ID

# The four nameservers to paste into Hostinger:
aws route53 get-hosted-zone --id $ZONE_ID --query 'DelegationSet.NameServers' --output text
```

**YOUR ACTION:** Hostinger → Domains → `unitalks.in` → *DNS / Nameservers* → **Change
nameservers** → *Use custom nameservers* → paste all four. Propagation is 1–24 h.

```powershell
nslookup -type=NS unitalks.in 8.8.8.8   # check progress
```

> Keep going while that propagates — Phases 2 (partly) through 10 don't depend on it.
> Only `acm wait certificate-validated` and the final `curl https://unitalks.in` do.

---

## Phase 2 — ACM certificate (us-east-1)

```powershell
$CERT_ARN = aws acm request-certificate `
  --domain-name $DOMAIN `
  --subject-alternative-names "www.$DOMAIN" "turn.$DOMAIN" `
  --validation-method DNS `
  --region us-east-1 `
  --query CertificateArn --output text
$CERT_ARN
```

Write the DNS validation records into Route 53:

```powershell
Start-Sleep -Seconds 15
$vo = (aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 `
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' | ConvertFrom-Json)

$changes = @($vo | Sort-Object Name -Unique | ForEach-Object {
  @{ Action = "UPSERT"; ResourceRecordSet = @{
       Name = $_.Name; Type = $_.Type; TTL = 300
       ResourceRecords = @(@{ Value = $_.Value }) } }
})
$json = @{ Changes = $changes } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText("$env:TEMP\acm-validation.json", $json)

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID `
  --change-batch "file://$env:TEMP\acm-validation.json"
```

Then block until issued (**requires the Hostinger nameserver change to be live**):

```powershell
aws acm wait certificate-validated --certificate-arn $CERT_ARN --region us-east-1
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 `
  --query 'Certificate.Status' --output text    # want: ISSUED
```

---

## Phase 3 — Secrets into SSM Parameter Store

```powershell
$JWT  = -join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })
$TURN = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })

aws ssm put-parameter --name /unitalks/JWT_SECRET  --type SecureString --value $JWT  --overwrite
aws ssm put-parameter --name /unitalks/TURN_SECRET --type SecureString --value $TURN --overwrite
aws ssm get-parameters-by-path --path /unitalks --query 'Parameters[].Name' --output text
```

`JWT_SECRET` is mandatory — `server/src/config/env.ts:18` throws and the container exits
without it. Neither secret is written to disk or committed; the EC2 boxes read them at boot
through their instance role.

---

## Phase 4 — ECR repository + push the backend image

```powershell
aws ecr create-repository --repository-name $ECR_REPO `
  --image-scanning-configuration scanOnPush=true `
  --query 'repository.repositoryUri' --output text

docker build --platform linux/amd64 -t "${ECR_REPO}:latest" .\server
docker tag "${ECR_REPO}:latest" $IMAGE
```

**Do not use `aws ecr get-login-password | docker login --password-stdin` here.** Piping the
~1770-character token through a PowerShell 5.1 pipe mangles it and the registry answers
`400 Bad Request`, even though the token itself is valid (a direct Basic-auth REST probe
against `/v2/` returns 200). PowerShell 5.1 also has no `<` stdin redirection to work
around it with. Write the auth into a throwaway Docker config instead — this also avoids
Docker Desktop's `credsStore` swallowing the entry, and leaves your real
`~/.docker/config.json` untouched:

```powershell
$REG = "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
$cfgDir = Join-Path $env:TEMP "ut-docker-cfg"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null

$pw = aws ecr get-login-password --region $REGION
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("AWS:$pw"))
[IO.File]::WriteAllText((Join-Path $cfgDir "config.json"),
  (@{ auths = @{ $REG = @{ auth = $auth } } } | ConvertTo-Json -Depth 6))

docker --config $cfgDir push $IMAGE
Remove-Item -Recurse -Force $cfgDir
```

Docker Desktop must actually be running first — if `docker build` reports
`failed to connect to the docker API at npipe:////./pipe/docker_engine`, start
`"C:\Program Files\Docker\Docker\Docker Desktop.exe"` and wait for
`docker info` to succeed.

---

## Phase 5 — IAM role + instance profile for both EC2 boxes

```powershell
$inline = (Get-Content .\deployment\aws\iam-ec2-inline.json -Raw) -replace 'ACCOUNT_ID', $ACCOUNT
[IO.File]::WriteAllText("$env:TEMP\iam-ec2-inline.json", $inline)

aws iam create-role --role-name unitalks-ec2-role `
  --assume-role-policy-document file://deployment/aws/iam-ec2-trust.json

aws iam attach-role-policy --role-name unitalks-ec2-role `
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam attach-role-policy --role-name unitalks-ec2-role `
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam put-role-policy --role-name unitalks-ec2-role `
  --policy-name unitalks-ssm-params `
  --policy-document "file://$env:TEMP\iam-ec2-inline.json"

aws iam create-instance-profile --instance-profile-name unitalks-ec2-profile
aws iam add-role-to-instance-profile `
  --instance-profile-name unitalks-ec2-profile --role-name unitalks-ec2-role

Start-Sleep -Seconds 20   # IAM is eventually consistent; run-instances fails if you rush
```

---

## Phase 6 — Security groups

```powershell
$VPC_ID = aws ec2 describe-vpcs --filters Name=is-default,Values=true `
  --query 'Vpcs[0].VpcId' --output text

# --- backend SG: port 80 reachable ONLY from CloudFront edge IPs ---
$SG_BACKEND = aws ec2 create-security-group --group-name unitalks-backend-sg `
  --description "UniTalks signaling backend" --vpc-id $VPC_ID `
  --query GroupId --output text

$CF_PL = aws ec2 describe-managed-prefix-lists `
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing `
  --query 'PrefixLists[0].PrefixListId' --output text

$perm = @{ IpProtocol = "tcp"; FromPort = 80; ToPort = 80
           PrefixListIds = @(@{ PrefixListId = $CF_PL }) }
[IO.File]::WriteAllText("$env:TEMP\sg-backend.json",
  "[" + ($perm | ConvertTo-Json -Depth 6 -Compress) + "]")

aws ec2 authorize-security-group-ingress --group-id $SG_BACKEND `
  --ip-permissions "file://$env:TEMP\sg-backend.json"

# --- coturn SG: TURN ports must be open to the internet by design ---
$SG_TURN = aws ec2 create-security-group --group-name unitalks-turn-sg `
  --description "UniTalks coturn" --vpc-id $VPC_ID --query GroupId --output text

aws ec2 authorize-security-group-ingress --group-id $SG_TURN --protocol tcp --port 3478 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_TURN --protocol udp --port 3478 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_TURN --protocol udp --port 49160-49200 --cidr 0.0.0.0/0

"SG_BACKEND=$SG_BACKEND  SG_TURN=$SG_TURN  CF_PL=$CF_PL"
```

No port 22 on either box — shell access is SSM Session Manager (Phase 11), so there's no
`.pem` to lose and no SSH surface.

---

## Phase 7 — Launch the backend EC2

```powershell
$AMI = aws ssm get-parameters `
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 `
  --query 'Parameters[0].Value' --output text

# LF line endings and no BOM, or cloud-init chokes on the shebang
$ud = (Get-Content .\deployment\aws\backend-userdata.sh -Raw) `
        -replace '__IMAGE__', $IMAGE `
        -replace '__CORS_ORIGIN__', "https://$DOMAIN"
[IO.File]::WriteAllText("$env:TEMP\backend-userdata.sh", ($ud -replace "`r`n", "`n"))

$EC2_BACKEND = aws ec2 run-instances `
  --image-id $AMI --instance-type t3.micro `
  --security-group-ids $SG_BACKEND `
  --iam-instance-profile Name=unitalks-ec2-profile `
  --user-data "file://$env:TEMP\backend-userdata.sh" `
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" `
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=unitalks-backend}]' `
  --query 'Instances[0].InstanceId' --output text

aws ec2 wait instance-running --instance-ids $EC2_BACKEND

# Elastic IP so the address survives a stop/start
$EIP_BACKEND = aws ec2 allocate-address --domain vpc --query AllocationId --output text
aws ec2 associate-address --instance-id $EC2_BACKEND --allocation-id $EIP_BACKEND

$BACKEND_DNS = aws ec2 describe-instances --instance-ids $EC2_BACKEND `
  --query 'Reservations[0].Instances[0].PublicDnsName' --output text
"EC2_BACKEND=$EC2_BACKEND  BACKEND_DNS=$BACKEND_DNS  EIP_BACKEND=$EIP_BACKEND"
```

Bootstrap (dnf update → docker → ECR pull → run) takes ~3 min. `$BACKEND_DNS` re-resolves to
the new Elastic IP, so it stays correct as the CloudFront origin.

---

## Phase 8 — Launch the coturn EC2

```powershell
$udt = (Get-Content .\deployment\aws\coturn-userdata.sh -Raw) -replace "`r`n", "`n"
[IO.File]::WriteAllText("$env:TEMP\coturn-userdata.sh", $udt)

$EC2_TURN = aws ec2 run-instances `
  --image-id $AMI --instance-type t3.micro `
  --security-group-ids $SG_TURN `
  --iam-instance-profile Name=unitalks-ec2-profile `
  --user-data "file://$env:TEMP\coturn-userdata.sh" `
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" `
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=unitalks-coturn}]' `
  --query 'Instances[0].InstanceId' --output text

aws ec2 wait instance-running --instance-ids $EC2_TURN

$EIP_TURN = aws ec2 allocate-address --domain vpc --query AllocationId --output text
aws ec2 associate-address --instance-id $EC2_TURN --allocation-id $EIP_TURN

$TURN_IP = aws ec2 describe-addresses --allocation-ids $EIP_TURN `
  --query 'Addresses[0].PublicIp' --output text
"EC2_TURN=$EC2_TURN  TURN_IP=$TURN_IP  EIP_TURN=$EIP_TURN"
```

> coturn advertises its own public IP, read from instance metadata **at container start**.
> Because the Elastic IP is attached after boot, rebuild the container once so it picks up
> the final address:
>
> ```powershell
> aws ssm send-command --instance-ids $EC2_TURN `
>   --document-name AWS-RunShellScript `
>   --parameters 'commands=["/usr/local/bin/coturn-redeploy"]'
> ```
>
> **Passing multi-line scripts to `send-command`:** the `commands=[...]` shorthand is
> word-split by the CLI and silently corrupts anything containing spaces, `{{ }}` or `;`
> (`Unknown options: {{.Status}};echo ...`). For more than one trivial command, write a
> JSON file and pass `--parameters file://...`:
>
> ```powershell
> [IO.File]::WriteAllText("$env:TEMP\ssm.json",
>   (@{ commands = @('docker ps', 'docker logs coturn --tail 20') } | ConvertTo-Json -Depth 5))
> aws ssm send-command --instance-ids $EC2_TURN `
>   --document-name AWS-RunShellScript --parameters "file://$env:TEMP\ssm.json"
> ```

---

## Phase 9 — S3 bucket + frontend build

```powershell
aws s3api create-bucket --bucket $BUCKET --region us-east-1
aws s3api put-public-access-block --bucket $BUCKET `
  --public-access-block-configuration `
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

$env:ComSpec = "C:\Windows\SysWOW64\cmd.exe"   # see gotcha 3 at the top
npm ci
npm run build
aws s3 sync .\build "s3://$BUCKET" --delete
```

`REACT_APP_API_URL` is deliberately left **unset**: `src/utils/socketService.js:7-24` then
falls back to `window.location.origin`, so API and WebSocket both ride the same CloudFront
origin and there is no cross-origin request at all.

---

## Phase 10 — CloudFront distribution + DNS

```powershell
$OAC_ID = aws cloudfront create-origin-access-control `
  --origin-access-control-config "Name=unitalks-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" `
  --query 'OriginAccessControl.Id' --output text

$cfg = (Get-Content .\deployment\aws\cloudfront-distribution.template.json -Raw) `
  -replace '__CALLER_REF__', "unitalks-$(Get-Date -Format yyyyMMddHHmmss)" `
  -replace '__BUCKET__', $BUCKET `
  -replace '__OAC_ID__', $OAC_ID `
  -replace '__BACKEND_DNS__', $BACKEND_DNS `
  -replace '__CERT_ARN__', $CERT_ARN
[IO.File]::WriteAllText("$env:TEMP\cf-dist.json", $cfg)

$dist = aws cloudfront create-distribution `
  --distribution-config "file://$env:TEMP\cf-dist.json" | ConvertFrom-Json
$CF_ID     = $dist.Distribution.Id
$CF_DOMAIN = $dist.Distribution.DomainName
"CF_ID=$CF_ID  CF_DOMAIN=$CF_DOMAIN"
```

Let CloudFront (and only CloudFront) read the private bucket:

```powershell
$pol = @{ Version = "2012-10-17"; Statement = @(@{
    Sid = "AllowCloudFrontOAC"; Effect = "Allow"
    Principal = @{ Service = "cloudfront.amazonaws.com" }
    Action = "s3:GetObject"; Resource = "arn:aws:s3:::$BUCKET/*"
    Condition = @{ StringEquals = @{
      "AWS:SourceArn" = "arn:aws:cloudfront::${ACCOUNT}:distribution/$CF_ID" } }
  }) } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText("$env:TEMP\bucket-policy.json", $pol)

aws s3api put-bucket-policy --bucket $BUCKET --policy "file://$env:TEMP\bucket-policy.json"
aws cloudfront wait distribution-deployed --id $CF_ID    # ~5-10 min
```

DNS records — apex + www as CloudFront aliases, `turn` as a plain A record:

```powershell
$recs = @(@("$DOMAIN", "www.$DOMAIN") | ForEach-Object {
  @{ Action = "UPSERT"; ResourceRecordSet = @{
       Name = $_; Type = "A"
       AliasTarget = @{ HostedZoneId = "Z2FDTNDATAQYW2"   # fixed, global CloudFront zone id
                        DNSName = $CF_DOMAIN; EvaluateTargetHealth = $false } } }
})
$recs += @{ Action = "UPSERT"; ResourceRecordSet = @{
    Name = "turn.$DOMAIN"; Type = "A"; TTL = 300
    ResourceRecords = @(@{ Value = $TURN_IP }) } }

$json = @{ Changes = @($recs) } | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText("$env:TEMP\dns.json", $json)

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID `
  --change-batch "file://$env:TEMP\dns.json"
```

---

## Phase 11 — Verify

```powershell
# The backend is only reachable through CloudFront (the SG blocks you directly)
curl.exe -s "https://$CF_DOMAIN/health"
curl.exe -s -X POST "https://$CF_DOMAIN/api/auth/token"

# Shell in without SSH
aws ssm start-session --target $EC2_BACKEND
#   sudo docker ps
#   sudo docker logs unitalks-backend --tail 50
#   sudo cat /var/log/unitalks-bootstrap.log

aws ssm start-session --target $EC2_TURN
#   sudo docker logs coturn --tail 50

# WebSocket smoke test
$tok = (curl.exe -s -X POST "https://$CF_DOMAIN/api/auth/token" | ConvertFrom-Json).token
npx -y wscat -c "wss://$CF_DOMAIN/ws?token=$tok"

# Once the Hostinger nameserver change has propagated
curl.exe -sI "https://unitalks.in"
```

TURN check: open https://icetest.info, enter `turn:turn.unitalks.in:3478` with credentials
from `https://unitalks.in/api/turn`, and confirm a candidate of type **relay** appears.

---

## Redeploying afterwards

```powershell
# Frontend
npm run build
aws s3 sync .\build "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"

# Backend
docker build --platform linux/amd64 -t $IMAGE .\server
docker push $IMAGE
aws ssm send-command --instance-ids $EC2_BACKEND `
  --document-name AWS-RunShellScript `
  --parameters 'commands=["/usr/local/bin/unitalks-redeploy"]'
```

---

## Known limitations of this topology

- **Single backend instance, by necessity.** `server/src/services/stateManager.ts:5-7` holds
  users, sessions and match queues in in-process `Map`s. A second instance would split the
  matchmaking pool, so users on different boxes could never be paired. Scaling out requires
  moving that state to ElastiCache/Redis first.
- **CloudFront → EC2 is plain HTTP.** The viewer hop is TLS; the edge-to-origin hop is not.
  Fixing it properly means an ALB with an ACM cert in front of the instance (+~$18/mo).
- **`CustomErrorResponses` is distribution-wide.** Rewriting 403/404 to `/index.html` is what
  makes React Router deep links work, but it also masks a genuine 404 from `/api/*`.
- **coturn has no TLS listener (5349).** UDP/TCP 3478 covers the usual symmetric-NAT case;
  networks that only allow outbound 443 still won't relay. Adding TURNS means mounting the
  ACM cert (or a certbot cert) into the coturn container.

## Teardown

```powershell
# CloudFront must be disabled and fully deployed before it can be deleted
aws ec2 terminate-instances --instance-ids $EC2_BACKEND $EC2_TURN
aws ec2 release-address --allocation-id $EIP_BACKEND
aws ec2 release-address --allocation-id $EIP_TURN
aws s3 rb "s3://$BUCKET" --force
aws ecr delete-repository --repository-name $ECR_REPO --force
aws route53 delete-hosted-zone --id $ZONE_ID
```

An Elastic IP that is allocated but **not** attached is billed hourly — release both.
