import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Time-limited TURN credentials, per the coturn REST API scheme
 * (`--use-auth-secret --static-auth-secret=<secret>`).
 *
 * The shared secret never leaves the server: the client gets a username of
 * `<expiry-unix-ts>:unitalks` and a credential of base64(HMAC-SHA1(secret, username)),
 * which coturn verifies without any per-user state. Credentials expire, so a leaked
 * pair can't be reused to relay traffic on our bandwidth indefinitely.
 */
router.get('/', (_req: Request, res: Response) => {
  if (!env.turnSecret || !env.turnHost) {
    // TURN not provisioned (local dev) - the client falls back to STUN only.
    res.json({ iceServers: [] });
    return;
  }

  try {
    const expiry = Math.floor(Date.now() / 1000) + env.turnTtlSeconds;
    const username = `${expiry}:unitalks`;
    const credential = crypto
      .createHmac('sha1', env.turnSecret)
      .update(username)
      .digest('base64');

    res.json({
      username,
      credential,
      ttl: env.turnTtlSeconds,
      iceServers: [
        { urls: `turn:${env.turnHost}:3478?transport=udp`, username, credential },
        { urls: `turn:${env.turnHost}:3478?transport=tcp`, username, credential },
      ],
    });
  } catch (error) {
    logger.error('Error generating TURN credentials:', error);
    res.status(500).json({ error: 'Failed to generate TURN credentials' });
  }
});

export default router;
