#!/bin/bash
set -euxo pipefail
exec > >(tee /var/log/coturn-bootstrap.log) 2>&1

REGION="us-east-1"
REALM="unitalks.in"
MIN_PORT=49160
MAX_PORT=49200

dnf update -y
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y awscli-2
systemctl enable --now docker

TOKEN="$(curl -sX PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')"
PUBLIC_IP="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)"
PRIVATE_IP="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/local-ipv4)"

TURN_SECRET="$(aws ssm get-parameter --name /unitalks/TURN_SECRET --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)"

docker rm -f coturn 2>/dev/null || true
docker run -d --name coturn --restart unless-stopped --network host \
  coturn/coturn:latest \
  -n --log-file=stdout --verbose \
  --listening-port=3478 \
  --listening-ip="$PRIVATE_IP" \
  --external-ip="${PUBLIC_IP}/${PRIVATE_IP}" \
  --relay-ip="$PRIVATE_IP" \
  --min-port="$MIN_PORT" --max-port="$MAX_PORT" \
  --realm="$REALM" \
  --use-auth-secret --static-auth-secret="$TURN_SECRET" \
  --no-cli --no-tlsv1 --no-tlsv1_1 \
  --no-multicast-peers \
  --denied-peer-ip=10.0.0.0-10.255.255.255 \
  --denied-peer-ip=172.16.0.0-172.31.255.255 \
  --denied-peer-ip=192.168.0.0-192.168.255.255 \
  --denied-peer-ip=169.254.0.0-169.254.255.255
