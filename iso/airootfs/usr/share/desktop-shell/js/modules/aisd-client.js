/* FELBIC OS — aisd WebSocket Client Singleton
 *
 * Single source of truth for the connection to aisd daemon (ws://127.0.0.1:8080).
 * All modules should import this instead of creating their own WebSocket.
 *
 * Usage:
 *   import { aisd } from './aisd-client.js';
 *   const resp = await aisd.call('ai/chat', { prompt: 'hello', session: 'main' });
 */

const AISD_WS_URL = 'ws://127.0.0.1:8080';
const RECONNECT_DELAY_MS = 3000;
const REQUEST_TIMEOUT_MS = 30000;

class AisdClient {
    constructor() {
        this._socket = null;
        this._connected = false;
        this._pendingRequests = new Map(); // id → { resolve, reject, timer }
        this._listeners = new Map();       // event → Set<callback>
        this._requestCounter = 1;
        this._reconnectTimer = null;
        this._connect();
    }

    // ── Connection Management ─────────────────────────────────────────────────

    _connect() {
        if (this._socket && (this._socket.readyState === WebSocket.CONNECTING || this._socket.readyState === WebSocket.OPEN)) {
            return;
        }

        try {
            this._socket = new WebSocket(AISD_WS_URL);
        } catch {
            this._scheduleReconnect();
            return;
        }

        this._socket.addEventListener('open', () => {
            this._connected = true;
            console.info('[aisd-client] Connected to aisd daemon at', AISD_WS_URL);
            document.body.classList.add('aisd-connected');
            this._emit('connected', null);
            if (this._reconnectTimer) {
                clearTimeout(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        });

        this._socket.addEventListener('message', (event) => {
            try {
                const msg = JSON.parse(event.data);

                // Push event (no id) → broadcast to listeners
                if (msg.event) {
                    this._emit(msg.event, msg.data ?? msg);
                    return;
                }

                // Response to a pending call
                if (msg.id !== undefined && this._pendingRequests.has(msg.id)) {
                    const { resolve, reject, timer } = this._pendingRequests.get(msg.id);
                    clearTimeout(timer);
                    this._pendingRequests.delete(msg.id);
                    if (msg.success) {
                        resolve(msg.result);
                    } else {
                        reject(new Error(msg.error || 'aisd error'));
                    }
                }
            } catch (err) {
                console.warn('[aisd-client] Failed to parse message:', err);
            }
        });

        this._socket.addEventListener('close', () => {
            this._connected = false;
            document.body.classList.remove('aisd-connected');
            this._emit('disconnected', null);
            // Reject all pending requests
            for (const { reject, timer } of this._pendingRequests.values()) {
                clearTimeout(timer);
                reject(new Error('aisd disconnected'));
            }
            this._pendingRequests.clear();
            this._scheduleReconnect();
        });

        this._socket.addEventListener('error', () => {
            // 'close' will follow, handled there
        });
    }

    _scheduleReconnect() {
        if (this._reconnectTimer) return;
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            console.info('[aisd-client] Attempting reconnect...');
            this._connect();
        }, RECONNECT_DELAY_MS);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    get connected() { return this._connected; }

    /**
     * Send a JSON-RPC style call to aisd and return a Promise with the result.
     * Resolves with `result` or rejects with error string.
     */
    call(method, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this._connected || !this._socket) {
                reject(new Error('aisd not connected'));
                return;
            }

            const id = this._requestCounter++;
            const timer = setTimeout(() => {
                this._pendingRequests.delete(id);
                reject(new Error(`aisd call '${method}' timed out after ${REQUEST_TIMEOUT_MS}ms`));
            }, REQUEST_TIMEOUT_MS);

            this._pendingRequests.set(id, { resolve, reject, timer });

            this._socket.send(JSON.stringify({ id, method, params }));
        });
    }

    /**
     * Register a listener for push events from aisd (e.g. 'stats', 'connected').
     * Returns an unsubscribe function.
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this._listeners.get(event)?.delete(callback);
    }

    _emit(event, data) {
        for (const cb of (this._listeners.get(event) ?? [])) {
            try { cb(data); } catch (e) { console.warn('[aisd-client] listener error:', e); }
        }
    }
}

// Singleton — created once, shared across all imports
export const aisd = new AisdClient();
