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
  });
} catch (e) {
  console.error('[mira:preload] bridge expose failed:', e);
}

require('@smartspectra/node-sdk/preload');
