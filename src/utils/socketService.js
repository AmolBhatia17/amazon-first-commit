class SocketService {
  constructor() {
    this.ws = null;
    this.token = null;
    // Use same origin when REACT_APP_API_URL is empty (production: API/WS via CloudFront)
    // For localhost development, use backend directly on port 8080
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl && envUrl.trim() !== '') {
      this.baseURL = envUrl.replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      // Check if we're on localhost (development)
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
      if (isLocalhost) {
        // Use backend directly for localhost development
        this.baseURL = 'http://localhost:8080';
      } else {
        // Production: use same origin (CloudFront)
        this.baseURL = window.location.origin;
      }
    } else {
      // Server-side rendering fallback
      this.baseURL = 'http://localhost:8080';
    }
    
    // Log the baseURL being used (helpful for debugging)
    if (typeof window !== 'undefined') {
      console.log('[socketService] Initialized with baseURL:', this.baseURL);
      console.log('[socketService] Current hostname:', window.location.hostname);
      console.log('[socketService] Current origin:', window.location.origin);
    }
    
    this.handlers = new Map();
  }

  async getAuthToken() {
    if (this.token) {
      return this.token;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get auth token');
      }

      const data = await response.json();
      this.token = data.token;
      return this.token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    const token = await this.getAuthToken();
    return new Promise((resolve, reject) => {
      // Convert http/https to ws/wss for WebSocket URL
      const wsUrl = this.baseURL.replace(/^https?:\/\//, (match) => {
        return match === 'https://' ? 'wss://' : 'ws://';
      }) + `/ws?token=${encodeURIComponent(token)}`;
      
      console.log('[socketService] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      // Set timeout for connection (10 seconds)
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('[socketService] Connection timeout');
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('[socketService] Connected successfully');
        resolve(ws);
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('[socketService] Connection error:', err?.message || err);
        console.error('[socketService] WebSocket URL was:', wsUrl);
        reject(err);
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log('[socketService] Connection closed:', event.code, event.reason);
        this.ws = null;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ping') {
            this.send({ type: 'pong' });
            return;
          }
          const cbs = this.handlers.get(msg.type);
          if (cbs) cbs.forEach((cb) => cb(msg));
        } catch (e) {
          console.error('WS message parse error', e);
        }
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getSocket() {
    return this.ws;
  }

  on(type, callback) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type).add(callback);
  }

  off(type, callback) {
    const set = this.handlers.get(type);
    if (set) set.delete(callback);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('[ws] sent:', message.type);
    }
  }
}

export const socketService = new SocketService();
