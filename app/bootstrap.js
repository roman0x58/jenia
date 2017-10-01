'use strict'
let { remote, ipcRenderer, shell } = require('electron')

window.renderer      = ipcRenderer
window.shared        = remote.getGlobal('shared')
window.currentWindow = remote.getCurrentWindow()
window.openExternal  = shell.openExternal