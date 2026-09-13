import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  corsOrigin?: string;
  turnSecret?: string;
  turnHost?: string;
  turnTtlSeconds: number;
}

function getEnvConfig(): EnvConfig {
  const port = parseInt(process.env.PORT || '8080', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const corsOrigin = process.env.CORS_ORIGIN;

  // TURN is optional: without it the client falls back to STUN only, which works
  // for most networks but not symmetric NAT.
  const turnSecret = process.env.TURN_SECRET || undefined;
  const turnHost = process.env.TURN_HOST || undefined;
  const turnTtlSeconds = parseInt(process.env.TURN_TTL_SECONDS || '86400', 10);

  return {
    port,
    nodeEnv,
    jwtSecret,
    corsOrigin,
    turnSecret,
    turnHost,
    turnTtlSeconds,
  };
}

export const env = getEnvConfig();
