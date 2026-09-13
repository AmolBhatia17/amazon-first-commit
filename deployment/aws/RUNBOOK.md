# UniTalks — AWS Deployment Runbook

**Deployed architecture** (as of 2026-09-14, account `037063405946`, us-east-1):

```
https://unitalks.j9m8cp1zn4j6g.us-east-1.cs.amazonlightsail.com
        │
        └─► Lightsail Container Service "unitalks" (nano, scale 1)
              └─ one container, image from ECR repo `unitalks`
                   ├─ React build served by Express  (GET /, /static/*, SPA fallback)
                   ├─ REST API                        (/health, /api/auth/token, /api/turn)
                   └─ WebSocket signaling             (/ws)

turn:13.219.31.203:3478  ──► EC2 t3.micro "unitalks-coturn" (Elastic IP, coturn 4.18.0)
```

Everything is served from **one origin**, so there is no CORS, no mixed content, and no
custom domain or certificate to manage — Lightsail terminates TLS on its own
`*.cs.amazonlightsail.com` hostname.

## Why this shape and not CloudFront + S3

The original design was CloudFront (HTTPS + CDN) in front of S3 for the frontend and an
EC2 box for signaling. It is built out in the appendix and the template files are still
here, but it is **not deployable on this account**:

```
AccessDenied: Your account must be verified before you can add new CloudFront
resources. To verify your account, please contact AWS Support.
```

New AWS accounts are gated on CloudFront until Support enables it, which needs a console
support case (the Support *API* requires a paid plan — `SubscriptionRequiredException`).
Attaching the `unitalks.in` domain additionally needs the nameservers moved at Hostinger
before ACM can validate. Both are manual steps outside AWS's API, so the deployment
switched to Lightsail, which hands out a working HTTPS hostname with no gate and supports
WebSockets. App Runner was also blocked (`SubscriptionRequiredException`); Amplify is
available but cannot proxy WebSockets to a container.

The Route 53 zone, ACM certificate, S3 bucket, backend EC2 and its Elastic IP were all
deleted once this was live — see *Teardown of the old path* below.

---

## Constraints that shape the deployment

- **Scale must stay 1.** `server/src/services/stateManager.ts:5-7` holds users, sessions
  and match queues in in-process `Map`s. A second container would split the matchmaking
  pool and users on different instances could never be paired. Scaling out requires moving
  that state into Redis/ElastiCache first.
- **`TURN_HOST` is a raw IP**, because there is no DNS zone. It is pinned to the coturn
  Elastic IP; if that IP ever changes, both the coturn container and the Lightsail
  deployment must be updated.
- **coturn has no TLS listener.** UDP/TCP 3478 covers the usual symmetric-NAT case, but
  networks that only allow outbound 443 will not relay. TURNS needs a real hostname and
  certificate, which needs the domain.

---

## Prerequisites on this machine

```powershell
$env:AWS_PROFILE = "unitalks"
$env:AWS_DEFAULT_REGION = "us-east-1"
$env:ComSpec = "C:\Windows\SysWOW64\cmd.exe"   # see gotcha 3
```

> **Four gotchas already worked around below — don't "simplify" them:**
>
> 1. **`Set-Content -Encoding utf8` writes a UTF-8 BOM**, and AWS CLI rejects BOM'd JSON
>    with `Error parsing parameter: Expected: '=', received: '﻿'`. Every JSON payload here
>    is written with `[IO.File]::WriteAllText(...)`, which omits the BOM. (This is what
>    corrupted the old `cloudfront-current-config.json` into UTF-16.)
> 2. **`ConvertTo-Json -AsArray` does not exist in PowerShell 5.1** — arrays are built by
>    hand as `"[" + ($x | ConvertTo-Json -Compress) + "]"`.
> 3. **`C:\Windows\System32\cmd.exe` is missing on this machine** (only the 32-bit copy in
>    `SysWOW64` survives), so npm cannot spawn a shell and every `npm ci` / `npm run build`
>    dies with `npm error enoent spawn C:\WINDOWS\system32\cmd.exe`. Set `$env:ComSpec` as
>    above, once per session. Worth repairing properly — `sfc /scannow` from an elevated
>    prompt, or check whether antivirus quarantined it.
> 4. **`aws ecr get-login-password | docker login --password-stdin` does not work here.**
>    Piping the ~1770-character token through a PowerShell 5.1 pipe corrupts it and the
>    registry answers `400 Bad Request`, even though the token is valid (a direct
>    Basic-auth REST probe of `/v2/` returns 200), and 5.1 has no `<` stdin redirection to
>    work around it. Use the isolated-config helper in Step 2.

Docker Desktop must be running. If `docker build` reports
`failed to connect to the docker API at npipe:////./pipe/docker_engine`, start
`"C:\Program Files\Docker\Docker\Docker Desktop.exe"` and wait for `docker info` to succeed.

---

## Redeploying the app (the routine path)

### Step 1 — build the all-in-one image

`Dockerfile` at the repo root builds the frontend and backend in separate stages and ships
them in one runtime image. Nothing else is needed; the React build is baked in.

```powershell
cd D:\Unitalks\UniTalks-WebRTC-Video-Chat
docker build -t unitalks:latest .
```

The frontend stage installs with `npm ci --omit=dev` on purpose: it skips `sharp`, which is
only used by an offline image script and has no prebuilt musl binary, while `react-scripts`
stays available because it is a runtime dependency.

Test it locally before pushing:

```powershell
docker run -d --name uttest -p 8098:8080 `
  -e JWT_SECRET=localtest -e TURN_SECRET=localturn -e TURN_HOST=13.219.31.203 `
  unitalks:latest
Invoke-WebRequest "http://localhost:8098"           -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest "http://localhost:8098/health"     -UseBasicParsing | Select-Object -Expand Content
Invoke-WebRequest "http://localhost:8098/api/turn"   -UseBasicParsing | Select-Object -Expand Content
docker container stop uttest; docker container rm uttest
```

### Step 2 — push to ECR

```powershell
$ACCOUNT = "037063405946"
$REG = "$ACCOUNT.dkr.ecr.us-east-1.amazonaws.com"
$IMG = "$REG/unitalks:latest"

$cfgDir = Join-Path $env:TEMP "ut-docker-cfg"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$pw = aws ecr get-login-password --region us-east-1
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("AWS:$pw"))
[IO.File]::WriteAllText((Join-Path $cfgDir "config.json"),
  (@{ auths = @{ $REG = @{ auth = $auth } } } | ConvertTo-Json -Depth 6))

docker tag unitalks:latest $IMG
docker --config $cfgDir push $IMG
Remove-Item -Recurse -Force $cfgDir
```

Writing an isolated config also stops Docker Desktop's `credsStore` from swallowing the
entry, and leaves the real `~/.docker/config.json` untouched.

### Step 3 — roll out a new deployment

Secrets live in SSM Parameter Store and are read straight into variables — they are never
written to the repo or echoed. Lightsail needs them as container environment variables, so
**rotating a secret means redeploying.**

```powershell
$URL = "https://unitalks.j9m8cp1zn4j6g.us-east-1.cs.amazonlightsail.com"
$JWT  = aws ssm get-parameter --name /unitalks/JWT_SECRET  --with-decryption --query 'Parameter.Value' --output text
$TURN = aws ssm get-parameter --name /unitalks/TURN_SECRET --with-decryption --query 'Parameter.Value' --output text

$containers = @{ app = @{
    image = "037063405946.dkr.ecr.us-east-1.amazonaws.com/unitalks:latest"
    environment = @{
      NODE_ENV = "production"; PORT = "8080"
      JWT_SECRET = $JWT; TURN_SECRET = $TURN
      TURN_HOST = "13.219.31.203"; CORS_ORIGIN = $URL
    }
    ports = @{ "8080" = "HTTP" }
} } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText("$env:TEMP\ls-containers.json", $containers)

$endpoint = @{
  containerName = "app"; containerPort = 8080
  healthCheck = @{ path = "/health"; successCodes = "200"
    healthyThreshold = 2; unhealthyThreshold = 3; timeoutSeconds = 5; intervalSeconds = 10 }
} | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText("$env:TEMP\ls-endpoint.json", $endpoint)

aws lightsail create-container-service-deployment --service-name unitalks `
  --containers "file://$env:TEMP\ls-containers.json" `
  --public-endpoint "file://$env:TEMP\ls-endpoint.json"

Remove-Item "$env:TEMP\ls-containers.json" -Force   # it holds the plaintext secrets
```

Then wait for it (a deployment takes ~3–5 minutes):

```powershell
do {
  $j = aws lightsail get-container-services --service-name unitalks --query 'containerServices[0]' | ConvertFrom-Json
  "service=$($j.state) deployment=$($j.currentDeployment.state)"
  if ($j.state -eq "RUNNING" -or $j.currentDeployment.state -eq "FAILED") { break }
  Start-Sleep -Seconds 25
} while ($true)
```

### Step 4 — verify

```powershell
$URL = "https://unitalks.j9m8cp1zn4j6g.us-east-1.cs.amazonlightsail.com"
Invoke-WebRequest $URL              -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest "$URL/health"     -UseBasicParsing | Select-Object -Expand Content
Invoke-WebRequest "$URL/api/turn"   -UseBasicParsing | Select-Object -Expand Content
(Invoke-WebRequest "$URL/api/auth/token" -Method POST -UseBasicParsing).Content | ConvertFrom-Json
```

WebSocket check — a healthy server answers with `{"type":"ready","userId":"..."}`:

```powershell
$tok = ((Invoke-WebRequest "$URL/api/auth/token" -Method POST -UseBasicParsing).Content | ConvertFrom-Json).token
$ws = New-Object Net.WebSockets.ClientWebSocket
$uri = [Uri]("wss://unitalks.j9m8cp1zn4j6g.us-east-1.cs.amazonlightsail.com/ws?token=" + [Uri]::EscapeDataString($tok))
$cts = New-Object Threading.CancellationTokenSource(15000)
$ws.ConnectAsync($uri, $cts.Token).Wait(); "state: " + $ws.State
$buf = New-Object byte[] 4096
$seg = New-Object ArraySegment[byte] -ArgumentList @(,$buf)
$recv = $ws.ReceiveAsync($seg, $cts.Token)
if ($recv.Wait(8000)) { [Text.Encoding]::UTF8.GetString($buf, 0, $recv.Result.Count) }
$ws.Dispose()
```

Container logs:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8   # the logs contain emoji
aws lightsail get-container-log --service-name unitalks --container-name app `
  --query 'logEvents[-20:].message' --output text
```

---

## Operating the coturn box

EC2 `unitalks-coturn`, Elastic IP `13.219.31.203`, security group `unitalks-turn-sg`
(3478 TCP+UDP and 49160-49200 UDP open to the internet, which TURN requires; **no port 22**
— shell access is SSM Session Manager, so there is no key pair to lose).

```powershell
aws ssm start-session --target i-0d47b65d96964ec38
#   sudo docker ps
#   sudo docker logs coturn --tail 40
#   sudo /usr/local/bin/coturn-redeploy     # rebuild the container
```

The image is pinned to `coturn/coturn:4.18.0`. It must stay pinned: `:latest` moved to 4.18,
which **removed `--no-tlsv1_1` and deprecated `--no-cli`**, and `turnserver` responds to an
unrecognized option by printing its usage and exiting 255 — the container sat in a restart
loop until the flags were dropped.

coturn reads its public IP from instance metadata **at container start**, so after any
Elastic IP change run `coturn-redeploy`.

> **Passing multi-line scripts to `ssm send-command`:** the `commands=[...]` shorthand is
> word-split by the CLI and silently corrupts anything containing spaces, `{{ }}` or `;`
> (`Unknown options: {{.Status}};echo ...`). Use a JSON file:
>
> ```powershell
> [IO.File]::WriteAllText("$env:TEMP\ssm.json",
>   (@{ commands = @('docker ps', 'docker logs coturn --tail 20') } | ConvertTo-Json -Depth 5))
> aws ssm send-command --instance-ids i-0d47b65d96964ec38 `
>   --document-name AWS-RunShellScript --parameters "file://$env:TEMP\ssm.json"
> ```

### Verifying TURN actually relays

Do **not** test from the coturn box itself — security groups are stateful, so a connection
originating on the instance never evaluates the inbound rule and the test passes even when
the port is closed to the world. Test from a different host. A STUN binding request is the
quickest proof:

```python
import socket, os, struct
pkt = struct.pack(">HHI", 0x0001, 0, 0x2112A442) + os.urandom(12)
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(6)
s.sendto(pkt, ("13.219.31.203", 3478))
d, _ = s.recvfrom(2048)
print("type 0x%04x" % struct.unpack(">H", d[0:2])[0])   # 0x0101 = Binding Success
```

Note that many consumer/campus networks block outbound 3478, so a failure from a laptop is
not proof the server is down — which is the very reason TURN exists here.

---

## Current inventory and cost

| Resource | Notes | ~$/mo |
|---|---|---|
| Lightsail container service `unitalks` | nano, scale 1, HTTPS included | 7.00 |
| EC2 `unitalks-coturn` t3.micro | + Elastic IP (free while attached) | ~7.50 |
| ECR repo `unitalks` | Lightsail pulls from it | ~0.05 |
| SSM params ×2 | SecureString | 0 |
| | | **~14.55** |

## Teardown of the old path (already done)

Deleted once Lightsail was live and verified: backend EC2 `i-02da9a58316f56aa6`, its
Elastic IP, `unitalks-backend-sg`, the S3 bucket `unitalks-frontend-037063405946`, the
`unitalks-backend` ECR repo, the CloudFront origin access control, the pending ACM
certificate, and the `unitalks.in` Route 53 hosted zone.

Full teardown of what remains:

```powershell
aws lightsail delete-container-service --service-name unitalks
aws ec2 terminate-instances --instance-ids i-0d47b65d96964ec38
aws ec2 release-address --allocation-id eipalloc-0261fe2112809f99f
aws ecr delete-repository --repository-name unitalks --force
aws ssm delete-parameters --names /unitalks/JWT_SECRET /unitalks/TURN_SECRET
```

An Elastic IP that is allocated but **not** attached is billed hourly — release it.

---

## Appendix — the CloudFront + custom domain path

Only worth doing once CloudFront is enabled on the account *and* you are willing to move
the `unitalks.in` nameservers to Route 53. It buys a real domain, a CDN, and the option of
TURNS on 443; it costs an extra ~$0.50/mo for the hosted zone plus CDN traffic.

`cloudfront-distribution.template.json` and `backend-userdata.sh` in this directory are the
leftovers of that design and are **not used by the current deployment**. The outline:

1. Support case (Console → Support → *Account and billing* → service **CloudFront**) to lift
   `Your account must be verified before you can add new CloudFront resources`.
2. `aws route53 create-hosted-zone --name unitalks.in`, then set those four nameservers at
   Hostinger and wait for delegation.
3. `aws acm request-certificate` in **us-east-1** (CloudFront only accepts certs from there)
   for the apex, `www` and `turn`; UPSERT the returned validation CNAMEs into the zone and
   `aws acm wait certificate-validated`.
4. Frontend back into a private S3 bucket, fronted by CloudFront with an origin access
   control; behaviours `/api/*` and `/ws*` pointed at the signaling origin with the
   `CachingDisabled` + `AllViewer` managed policies.
5. Alias A records for the apex and `www` at the distribution (`HostedZoneId`
   `Z2FDTNDATAQYW2`), plus an A record for `turn` at the coturn Elastic IP.

Two things to know if you go back to it: CloudFront's `CustomErrorResponses` are
distribution-wide, so rewriting 403/404 to `/index.html` for React Router deep links also
masks genuine 404s from `/api/*`; and a CloudFront→EC2 origin over plain HTTP leaves the
edge-to-origin hop unencrypted unless you put an ALB with its own ACM certificate in front.

Also stale in the repo from the previous Vercel/AWS attempts, kept only for history:
`buildspec.yml`, `amplify.yml`, `cloudfront-current-config.json`,
`cloudfront-full-config.json` (all reference the old account `278513763034`).
