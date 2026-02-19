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
      const wsUrl = `${this.baseURL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        resolve(ws);
      };

      ws.onerror = (err) => {
        console.error('Socket connect_error:', err?.message || err);
        reject(err);
      };

      ws.onclose = () => {
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
