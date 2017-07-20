'use strict'
import R from 'ramda'
import notifications from '../components/notifications'

export const callMain = R.curryN(2, (...args) => ipcRenderer.send.apply(ipcRenderer, args))
export const ipc = R.curryN(2, (...args) => ipcRenderer.send.apply(ipcRenderer, args))
export const ipcRequest = (message, ...args) => {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            notifications.error('IPC request timedout')
            reject('Ipc request timedout')
        }, 30000)
        ipcRenderer.send.apply(ipcRenderer, ['request', { msgType: message, args: args }])
        ipcRenderer.once(message, (e, v) => {
            clearTimeout(timeout)
            resolve(v)
        })
        ipcRenderer.once(message + 'fail', (e, v) => {
            clearTimeout(timeout)
            notifications.error(v)
            reject(v)
        })
    })
}