'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../components/util'
import Form from '../components/form/form'
import { env } from '../components/util'

export default {
    oninit(vnode) {
        vnode.state = u.config(vnode.attrs.model.settings)
    },
    view({ state }) {
        return m('.jn-app',
            m(Form, {
                formCls: 'jn-app__settings',
                fields: [
                    {
                        type: 'text', name: 'refreshinterval', label: 'Refresh interval', inputWidth: '100px',
                        validator: [/^([1-9]\d*)$/, 'Value should be a valid number'],
                        desc: 'Interval in seconds after which app will be refreshed. It makes xhr request each time. Default interval is 5 seconds.', value: (v) => state('refreshinterval', v)
                    },
                    env.whenDarwin({
                        type: 'checkbox', name: 'keepindock', label: 'Keep in dock',
                        desc: 'Kepp the application icon in OS X dock.', value: (v) => state('keepindock', v)
                    }),
                    {
                        type: 'checkbox', name: 'quitonclose', label: 'Quit app on close',
                        desc: 'When you click a close button the app automatically closed, otherwise it will be in the background and can be accessed from the tray', value: (v) => state('quitonclose', v)
                    },
                    {
                        type: 'checkbox', name: 'saveserverpass', label: 'Save server password',
                        desc: 'Save a server password when login is successful. It will be saved in the plain format.', value: (v) => state('saveserverpass', v)
                    },
                    R.either(env.whenDarwin, env.whenWin32)({
                        type: 'checkbox', name: 'autoupdate', label: 'Download updates automatically',
                        desc: 'When a new update available it will be downloaded automatically', value: (v) => state('autoupdate', v)
                    })
                ]
            })
        )
    }
}