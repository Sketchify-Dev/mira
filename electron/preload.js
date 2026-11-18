'use strict';

// Mira preload: key-request channel FIRST, then the SDK IPC bridge.
// Order matters: if the SDK preload ever throws, our bridge must already be
// exposed. The sandboxed renderer cannot read argv or env, so it asks main
// over IPC (mira:get-api-key -> string). Main owns the secret: shell env
// wins, .env fills the gap, and the value never touches disk or query
// strings. Mock mode needs no key at all.

const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('__miraBridge', {
    getApiKey: () => ipcRenderer.invoke('mira:get-api-key'),
    // Harness file session (main owns the SDK): start/stop the useFile
    // session and subscribe to its forwarded events. No-ops outside
    // --harness mode; the live camera path never touches these.
    harnessStart: () => ipcRenderer.invoke('mira:harness-start'),
    harnessStop: () => ipcRenderer.invoke('mira:harness-stop'),
    onHarnessEvent: (cb) => ipcRenderer.on('mira:harness-event', (_ev, data) => cb(data)),
  });
} catch (e) {
  console.error('[mira:preload] bridge expose failed:', e);
}

require('@smartspectra/node-sdk/preload');
