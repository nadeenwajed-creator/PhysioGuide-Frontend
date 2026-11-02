// Push channel for messaging: the backend notifies every session of a user
// the moment a message is sent, a conversation is read, or a new thread opens.
// Each event triggers one short-trailing workspace refresh, so both sides see
// changes in milliseconds instead of waiting for the 20s page poll. The poll
// stays as the safety net for anything a dropped push event would miss.

import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { loadSession } from './auth/session.js';
import { mockEnabled } from './runtime.js';

const RESTART_DELAY = 15000;
const FLUSH_DELAY = 150;

let connection = null;
let connecting = null;
let active = false;
let restartTimer = 0;
let flushTimer = 0;
const listeners = new Set();

// The API base URL may sit behind an HTTPS redirect (local dev runs http and
// https on different ports); VITE_SIGNALR_HUB_URL overrides the derivation for
// exactly that case. Production api bases are already https and need nothing.
function hubUrl() {
  const override = import.meta.env?.VITE_SIGNALR_HUB_URL;
  if (override) return override;
  const root = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  return `${root}/hubs/messages`;
}

function notifyChanged() {
  // Message + read + list events often land together; one trailing refresh
  // absorbs the burst instead of refetching the workspace for each event.
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = 0;
    listeners.forEach((listener) => listener());
  }, FLUSH_DELAY);
}

function scheduleRestart() {
  if (!active || restartTimer) return;
  restartTimer = window.setTimeout(() => {
    restartTimer = 0;
    void connect();
  }, RESTART_DELAY);
}

async function connect() {
  if (!active || connecting || connection) return;
  // Re-read the session on every attempt: the gateway rotates the token on
  // refresh, so a reconnect after an expiry picks up the rotated one.
  const token = loadSession()?.token;
  if (!token) {
    scheduleRestart();
    return;
  }
  const candidate = new HubConnectionBuilder()
    .withUrl(hubUrl(), {
      // Auth is the bearer token, never cookies; credentials 'include' would
      // also make the browser reject the API's wildcard CORS header.
      accessTokenFactory: () => loadSession()?.token || token,
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .configureLogging(LogLevel.Error)
    .build();

  candidate.on('workspaceChanged', notifyChanged);
  // A reconnect gap may hide events; the refresh closes it immediately.
  candidate.onreconnected(() => notifyChanged());
  candidate.onclose(() => {
    if (connection === candidate) connection = null;
    scheduleRestart();
  });

  connecting = candidate;
  try {
    await candidate.start();
    connection = candidate;
    notifyChanged();
  } catch {
    candidate.stop().catch(() => {});
    scheduleRestart();
  } finally {
    if (connecting === candidate) connecting = null;
  }
}

function stopAll() {
  active = false;
  window.clearTimeout(restartTimer);
  restartTimer = 0;
  window.clearTimeout(flushTimer);
  flushTimer = 0;
  const current = connection;
  const pending = connecting;
  connection = null;
  connecting = null;
  current?.stop().catch(() => {});
  pending?.stop().catch(() => {});
}

// Registers a listener (usually the layout's workspace refresh) and starts
// the shared connection on first subscriber. Returns the unsubscribe function.
export function startMessagingRealtime(onChanged) {
  if (mockEnabled || typeof window === 'undefined') return () => {};
  listeners.add(onChanged);
  if (!active) {
    active = true;
    void connect();
  }
  return () => {
    listeners.delete(onChanged);
    if (listeners.size === 0) stopAll();
  };
}
