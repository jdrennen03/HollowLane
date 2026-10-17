const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('hlDesktop', {
  hostStart: code => ipcRenderer.invoke('hl-host-start', code),
  hostStop: () => ipcRenderer.invoke('hl-host-stop'),
  discover: code => ipcRenderer.invoke('hl-discover', code),
  platform: process.platform,
});
