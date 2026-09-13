#!/bin/bash
set -euxo pipefail
exec > >(tee /var/log/unitalks-bootstrap.log) 2>&1

REGION="us-east-1"
IMAGE="__IMAGE__"
CORS_ORIGIN="__CORS_ORIGIN__"

dnf update -y
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y awscli-2
systemctl enable --now docker

cat > /usr/local/bin/unitalks-redeploy <<'INNER'
#!/bin/bash
set -euo pipefail
REGION="us-east-1"
IMAGE="__IMAGE__"
CORS_ORIGIN="__CORS_ORIGIN__"
ACCOUNT_ID="$(echo "$IMAGE" | cut -d. -f1)"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

JWT_SECRET="$(aws ssm get-parameter --name /unitalks/JWT_SECRET --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)"
TURN_SECRET="$(aws ssm get-parameter --name /unitalks/TURN_SECRET --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text 2>/dev/null || echo '')"

docker pull "$IMAGE"
docker rm -f unitalks-backend 2>/dev/null || true
docker run -d --name unitalks-backend --restart unless-stopped \
  -p 80:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ORIGIN="$CORS_ORIGIN" \
  -e TURN_SECRET="$TURN_SECRET" \
  -e TURN_HOST="turn.unitalks.in" \
  "$IMAGE"
docker image prune -f
INNER

chmod +x /usr/local/bin/unitalks-redeploy
/usr/local/bin/unitalks-redeploy
