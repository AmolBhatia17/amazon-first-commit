---
name: Video Chat Backend
overview: Build a production-ready TypeScript backend for anonymous video chat with WebRTC signaling, matchmaking queue, JWT authentication, and session management. Compatible with existing socket.io frontend.
todos: []
---

# Video Chat Backend - Phase 1 Implementation Plan

## Architecture Overview

The backend will be a Node.js 20+ TypeScript application using Express for HTTP endpoints and socket.io for WebSocket signaling. It implements anonymous JWT authentication, FIFO matchmaking queue, WebRTC signaling relay, and session management.

## Project Structure

```
server/
├── src/
│   ├── index.ts                 # Entry point, Express + Socket.io setup
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   └── jwt.ts               # JWT configuration and utilities
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification middleware
│   │   └── errorHandler.ts      # Error handling middleware
│   ├── routes/
│   │   └── auth.ts              # POST /api/auth/token endpoint
│   ├── services/
│   │   ├── matchmaking.ts       # FIFO queue and matching logic
│   │   ├── sessionManager.ts   # Session lifecycle management
│   │   └── signaling.ts         # WebRTC signal forwarding
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── utils/
│       └── logger.ts             # Logging utility
├── Dockerfile                   # Production Docker image
├── .dockerignore
├── .env.example                 # Environment variables template
├── package.json
├── tsconfig.json                # TypeScript strict configuration
└── README.md                    # Deployment and testing guide
```

## Core Components

### 1. Authentication Service (`src/routes/auth.ts`)

**POST /api/auth/token**

- Generates anonymous JWT token
- No user identification required
- Token expires in 24 hours
- Returns: `{ token: string, expiresIn: number }`

**JWT Payload:**

```typescript
{
  userId: string,      // Random UUID
  type: 'anonymous',
  iat: number,
  exp: number
}
```

### 2. WebSocket Authentication (`src/middleware/auth.ts`)

- Verifies JWT from `Authorization: Bearer <token>` header in handshake
- Extracts userId from token
- Rejects connection if token invalid/expired
- Attaches userId to socket data

### 3. Matchmaking Service (`src/services/matchmaking.ts`)

**FIFO Queue Implementation:**

- Maintains separate queue for video mode
- Queue stores: `{ socketId, userId, timestamp, partnerId? }`
- Matching logic:
  - If queue has waiting user → match immediately
  - If queue empty → add to queue, wait for next user
  - Skip support: remove from current match, requeue at front
- Timeout handling: remove stale queue entries (30s timeout)

**Events:**

- `joinQueue` - Client joins matchmaking queue
- `match` - Server emits when two users matched
- `partnerSkipped` - Server emits when partner skips

### 4. Signaling Service (`src/services/signaling.ts`)

**WebRTC Signal Relay:**

- Forwards SDP offers/answers and ICE candidates
- Event: `signal` - Client emits `{ to: partnerId, signal: data }`
- Server forwards to partner: `{ from: socketId, signal: data }`
- Session isolation: only forward signals between matched partners

**Heartbeat:**

- Ping/pong every 30 seconds
- Detect dead connections after 60s of no pong
- Cleanup disconnected sessions

### 5. Session Manager (`src/services/sessionManager.ts`)

**Session Lifecycle:**

- Track active sessions: `Map<socketId, Session>`
- Session contains: `{ userId, partnerId, partnerSocketId, createdAt, lastActivity }`
- Cleanup on disconnect:
  - Notify partner via `partnerDisconnected` event
  - Remove from matchmaking queue
  - Clear session data
- Reconnect logic:
  - If partner disconnects, remaining user auto-requeued
  - Handle duplicate connections (disconnect old socket)

**Auto Requeue:**

- On partner disconnect → requeue remaining user
- On partner skip → requeue both users (skipped user at front)

## WebSocket Events

### Client → Server

1. **joinQueue**
   ```typescript
   { mode: 'video', partnerId?: string }
   ```


   - Join matchmaking queue
   - Optional `partnerId` for direct connections

2. **signal**
   ```typescript
   { to: string, signal: any }
   ```


   - Forward WebRTC signal (SDP/ICE) to partner

3. **partnerSkipped**
   ```typescript
   { to: string }
   ```


   - Notify server that user skipped partner

### Server → Client

1. **match**
   ```typescript
   { partnerId: string, initiator: boolean }
   ```


   - Emitted when two users matched
   - `initiator` determines WebRTC initiator role

2. **signal**
   ```typescript
   { from: string, signal: any }
   ```


   - Forwarded WebRTC signal from partner

3. **partnerDisconnected**

   - Emitted when partner disconnects
   - Triggers cleanup and auto-requeue

4. **partnerSkipped**

   - Emitted when partner skips
   - Triggers cleanup and requeue

## Implementation Details

### TypeScript Configuration

- Strict mode enabled
- Target: ES2022
- Module: CommonJS (for Node.js compatibility)
- No `any` types, proper error handling

### Error Handling

- All async operations wrapped in try-catch
- WebSocket errors logged and handled gracefully
- Invalid events ignored with warning logs
- Connection errors don't crash server

### Performance

- In-memory data structures (Map, Set) for O(1) lookups
- Queue operations are O(1)
- Session cleanup runs on disconnect (no polling)
- Heartbeat prevents memory leaks

### Security

- JWT secret from environment variable
- Token expiration enforced
- WebSocket origin validation (configurable)
- Rate limiting on auth endpoint (future: implement)

## Docker & Cloud Run

### Dockerfile

- Multi-stage build
- Node.js 20 Alpine base
- Production dependencies only
- Non-root user
- Health check endpoint

### Environment Variables

- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - JWT signing secret (required)
- `NODE_ENV` - Environment (production/development)
- `CORS_ORIGIN` - Allowed CORS origins (optional)

### Cloud Run Compatibility

- Listens on `PORT` environment variable
- Graceful shutdown handling
- Health check: `GET /health`
- Stateless design (no persistent storage)

## Testing Strategy

### Local Testing

1. Start server: `npm run dev`
2. Get JWT: `POST http://localhost:8080/api/auth/token`
3. Connect WebSocket with JWT in Authorization header
4. Test matchmaking flow
5. Test signaling flow
6. Test skip/disconnect scenarios

### Integration Testing

- Test with frontend client
- Verify WebRTC connection establishment
- Test reconnection scenarios
- Load testing with multiple concurrent users

## Files to Create

1. `server/src/index.ts` - Main server setup
2. `server/src/config/env.ts` - Environment config
3. `server/src/config/jwt.ts` - JWT utilities
4. `server/src/middleware/auth.ts` - Auth middleware
5. `server/src/middleware/errorHandler.ts` - Error handling
6. `server/src/routes/auth.ts` - Auth routes
7. `server/src/services/matchmaking.ts` - Matchmaking logic
8. `server/src/services/sessionManager.ts` - Session management
9. `server/src/services/signaling.ts` - Signaling service
10. `server/src/types/index.ts` - Type definitions
11. `server/src/utils/logger.ts` - Logging utility
12. `server/Dockerfile` - Docker configuration
13. `server/.dockerignore` - Docker ignore file
14. `server/.env.example` - Environment template
15. `server/package.json` - Dependencies
16. `server/tsconfig.json` - TypeScript config
17. `server/README.md` - Documentation

## Dependencies

**Production:**

- `express` - HTTP server
- `socket.io` - WebSocket server
- `jsonwebtoken` - JWT handling
- `uuid` - Generate user IDs
- `dotenv` - Environment variables

**Development:**

- `typescript` - TypeScript compiler
- `@types/node` - Node.js types
- `@types/express` - Express types
- `@types/jsonwebtoken` - JWT types
- `@types/uuid` - UUID types
- `ts-node-dev` - Development server with hot reload
- `@typescript-eslint/eslint-plugin` - ESLint for TypeScript
- `@typescript-eslint/parser` - ESLint parser

## Critical Implementation Notes

1. **No Media Relay**: All WebRTC media is peer-to-peer. Backend only handles signaling.

2. **Session Isolation**: Signals only forwarded between matched partners. Validate `to` field matches current partner.

3. **Queue Management**: 

   - Remove users from queue on match
   - Handle skip by removing from current session and requeuing
   - Cleanup stale queue entries periodically

4. **Connection Health**:

   - Ping/pong every 30s
   - Disconnect after 60s of no response
   - Cleanup on disconnect event

5. **Error Recovery**:

   - Invalid signals logged but don't crash
   - Disconnected users automatically cleaned up
   - Orphaned sessions cleaned up on timeout

6. **Scalability Considerations**:

   - In-memory state (single instance)
   - For horizontal scaling, would need Redis (future phase)
   - Current design supports single Cloud Run instance

## Deployment Checklist

- [ ] Environment variables configured
- [ ] JWT_SECRET set securely
- [ ] Docker image builds successfully
- [ ] Health check responds
- [ ] WebSocket connections work
- [ ] Matchmaking queue functions
- [ ] Signaling forwards correctly
- [ ] Skip/disconnect handled properly
- [ ] No memory leaks (session cleanup)
- [ ] Graceful shutdown works