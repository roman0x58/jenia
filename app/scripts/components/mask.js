'use strict'

import m from 'mithril'
import flyd from 'flyd'

const state = {
    active: flyd.stream(false)
}

export default {
    isActive: state.active,
    hide() {
        state.active(false)
    },
    show() {
        state.active(true)
    },
    view() {
        return state.active() ? m('.jn-spinner.jn-spinner--show') : null
    }
}