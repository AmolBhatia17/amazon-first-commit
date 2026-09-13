#!/bin/bash
set -euxo pipefail
exec > >(tee /var/log/coturn-bootstrap.log) 2>&1

dnf update -y
dnf install -y docker
command -v aws >/dev/null 2>&1 || dnf install -y awscli-2
systemctl enable --now docker

# Written as a script so the container can be rebuilt later (e.g. after an Elastic IP
# change) without re-running cloud-init: `coturn-redeploy`.
cat > /usr/local/bin/coturn-redeploy <<'INNER'
#!/bin/bash
set -euo pipefail
REGION="us-east-1"
REALM="unitalks.in"
# Pinned: the `latest` tag moved to coturn 4.18, which removed --no-tlsv1_1 and
# deprecated --no-cli, and the container crash-looped on the unrecognized option.
IMAGE="coturn/coturn:4.18.0"
MIN_PORT=49160
MAX_PORT=49200

TOKEN="$(curl -sX PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')"
PUBLIC_IP="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)"
PRIVATE_IP="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/local-ipv4)"

TURN_SECRET="$(aws ssm get-parameter --name /unitalks/TURN_SECRET --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)"

docker pull "$IMAGE"
docker rm -f coturn 2>/dev/null || true

# --network host: TURN relays across a wide UDP port range, which is impractical to
# publish through Docker's userland proxy.
# The denied-peer-ip ranges stop the relay being used to reach private VPC addresses.
docker run -d --name coturn --restart unless-stopped --network host "$IMAGE" \
  -n --log-file=stdout \
  --listening-port=3478 \
  --listening-ip="$PRIVATE_IP" \
  --external-ip="${PUBLIC_IP}/${PRIVATE_IP}" \
  --relay-ip="$PRIVATE_IP" \
  --min-port="$MIN_PORT" --max-port="$MAX_PORT" \
  --realm="$REALM" \
  --use-auth-secret --static-auth-secret="$TURN_SECRET" \
  --cli-ip=127.0.0.1 \
  --no-multicast-peers \
  --denied-peer-ip=10.0.0.0-10.255.255.255 \
  --denied-peer-ip=172.16.0.0-172.31.255.255 \
  --denied-peer-ip=192.168.0.0-192.168.255.255 \
  --denied-peer-ip=169.254.0.0-169.254.255.255
INNER

chmod +x /usr/local/bin/coturn-redeploy
/usr/local/bin/coturn-redeploy
