'use strict'

import m from 'mithril'
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
                    env.whenDarwin({ type: 'checkbox', name: 'keepindock', label: 'Keep in dock',
                        desc: 'Kepp the application icon in OS X dock.', value: (v) => state('keepindock', v) }),
                    { type: 'checkbox', name: 'quitonclose', label: 'Quit app on close',
                        desc: 'When you click a close button the app automatically closed, otherwise it will be in the background and can be accessed from the tray', value: (v) => state('quitonclose', v) },
                    { type: 'checkbox', name: 'saveserverpass', label: 'Save server password',
                        desc:'Save a server password when login is successful. It will be saved in the plain format.', value: (v) => state('saveserverpass', v) }
                ]
            })
        )
    }
}