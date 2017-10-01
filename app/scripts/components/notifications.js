'use strict'

import m from 'mithril'
import R from 'ramda'
import util from './util'
import { $add, $update, $rm, promisify } from './util'
import flyd from 'flyd'
import dom from './dom'

const types = ['success', 'info', 'error', 'warn']
const convert = R.converge(R.zipObj, [R.nthArg(1), R.map])

let animateOnRemove
const state = {
    max: 1,
    items: flyd.stream([]),
    del(i) {
        animateOnRemove = true
        $rm(i)(state.items)
    },
    add(message, type, attrs = {}) {
        let n = { message, type, id: util.id(), attrs }
        if (attrs.dismissable !== false) setTimeout(() => state.del(n), 5000)
        if (state.items().length >= state.max) {
            animateOnRemove = false
            return $update(state.max - 1, n)(state.items)
        }

        return $add(n)(state.items)
    }
}

state.items.map(m.redraw)

const notification = {
    onbeforeremove: R.when(() => animateOnRemove, promisify(dom.switch('fade-in', 'fade-out'), 300)),
    oncreate: dom.mod('fade-in'),
    view({ attrs }) {
        const baseOpts = { key: attrs.key }
        if (R.is(Function, attrs.onnotifyclick)) {
            baseOpts.style = { cursor: 'pointer' }
            baseOpts.onclick = (e) => {
                e.stopPropagation()
                attrs.onnotifyclick(e)
            }
        }
        return m(`section.jn-notify.jn-notify--${attrs.type}`, baseOpts, [
            m('span.jn-notify__message', `${attrs.message}`),
            m('span.jn-notify__close-tool', { onclick: attrs.onclick }, util.svg('x'))
        ])
    }
}

const notifications = R.merge(convert((i) => (message, attrs) => state.add(message, i, attrs), types), {
    oninit({ attrs }) {
        if (attrs.max) {
            state.max = attrs.max
        }
    },
    view() {
        return m('div.jn-notifications', state.items().map((i) => m(notification, {
            message: i.message, type: i.type, onclick: (e) => {
                e.stopPropagation()
                state.del(i)
            }, key: i.id, onnotifyclick: i.attrs.onclick
        }), state.items()))
    }
})



export default notifications
