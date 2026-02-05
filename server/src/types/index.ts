export interface JWTPayload {
  userId: string;
  type: 'anonymous';
  iat: number;
  exp: number;
}

export enum UserState {
  IDLE = 'idle',
  SEARCHING = 'searching',
  CONNECTED = 'connected',
  SKIPPED = 'skipped', 
  DISCONNECTED = 'disconnected'
}

export type ClientMessage =
  | { type: 'join'; mode?: 'video' | 'audio' | 'text' }
  | { type: 'signal'; signalType: 'offer' | 'answer' | 'ice'; data: unknown }
  | { type: 'skip' }
  | { type: 'leave' }
  | { type: 'cancel' }
  | { type: 'acknowledge' }
  | { type: 'pong' };

export type ServerMessage =
  | { type: 'ready'; userId: string }
  | { type: 'matched'; partnerId: string; initiator: boolean; sessionId: string }
  | { type: 'signal'; from: string; signalType: 'offer' | 'answer' | 'ice'; data: unknown }
  | { type: 'partner-left' }
  | { type: 'partner-skipped' }
  | { type: 'queue'; position: number }
  | { type: 'session-ready' }
  | { type: 'search-cancelled' }
  | { type: 'error'; message: string }
  | { type: 'ping' };

export interface Session {
  sessionId: string;
  userA: string;
  userB: string;
  createdAt: number;
  lastActivity: number;
  acknowledgedBy: Set<string>;
  state: 'pending' | 'active' | 'ended';
  mode: 'video' | 'audio' | 'text';
}

export interface QueueEntry {
  userId: string;
  enqueuedAt: number;
}

export interface UserRecord {
  userId: string;
  ws: import('ws').WebSocket;
  state: UserState;
  sessionId?: string;
  lastPong: number;
  skipCount: number;
  lastSkipTime: number;
  enqueuedAt?: number;
  mode: 'video' | 'audio' | 'text';
}

export interface WsClient extends import('ws').WebSocket {
  isAlive: boolean;
  userId: string;
}
