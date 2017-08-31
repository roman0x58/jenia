'use strict'
import m from 'mithril'
import flyd from 'flyd'
import R, { equals } from 'ramda'
import util from './util'
import { Maybe } from 'ramda-fantasy'

const state = {
    opened: flyd.stream(),
    config: flyd.stream({})
}

state.opened.map(m.redraw)

const config = util.config(state.config)
const createM = R.ifElse(util.isM, m, R.identity)
const keys = { ENTER: 27 }
const onKey = (key, fn) => (e) => equals(e.keyCode, key) ? fn(e, key) : e.redraw = false
const Modal = {
    show(config) {
        state.config(config)
        state.opened(true)
    },
    hide() {
        Maybe(config('onclose')).map(R.call)
        state.opened(false)
    },
    view() {
        return state.opened() ? m('.jn-modal.jn-modal--show.jn-modal--scale-in', {
            class: config('class'),
            tabindex: -1,
            oncreate: (vnode) => vnode.dom.focus(),
            onkeyup: onKey(keys.ENTER, () => state.opened(false))
        }, [
            m('.jn-modal__wrapper', [
                m('header.jn-modal__header', m('h3', config('title')), m('span.jn-modal__close', { onclick: Modal.hide }, util.svg('x'))),
                m('section.jn-modal__content', createM(config('body'))),
                config('buttons') ? m('footer.jn-modal__footer', config('buttons').map((b) => m('button.jn-button', { onclick: b.callback }, b.label))) : null
            ]),
        ]) : null
    }
}

export default Modal