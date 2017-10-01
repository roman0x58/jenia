'use strict'
import R from 'ramda'

export const callMain = R.curryN(2, (...args) => renderer.send.apply(renderer, args))
export const ipc = R.curryN(2, (...args) => renderer.send.apply(renderer, args))
export const ipcRequest = (message, ...args) => {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            renderer.removeAllListeners(message + 'fail')
            renderer.removeAllListeners(message)
            reject('Ipc request timedout')
        }, 30000)
        renderer.send.apply(renderer, ['request', { msgType: message, args: args }])
        renderer.once(message, (e, v) => {
            renderer.removeAllListeners(message + 'fail')
            clearTimeout(timeout)
            resolve(v)
        })
        renderer.once(message + 'fail', (e, v) => {
            renderer.removeAllListeners(message)
            clearTimeout(timeout)
            reject(v)
        })
    })
}