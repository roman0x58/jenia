'use strict'
let { remote, ipcRenderer } = require('electron')

window.ipcRenderer   = ipcRenderer
window.shared        = remote.getGlobal('shared')
window.currentWindow = remote.getCurrentWindow()