'use strict'
import m from 'mithril'
import flyd from 'flyd'
import R from 'ramda'
import util from './util'
import { Maybe } from 'ramda-fantasy'

const state = {
    opened: flyd.stream(),
    config: flyd.stream({})
}

const config   = util.config(state.config)
const createM  = R.ifElse(util.isM, m, R.identity)
const Modal = {
    show(config) {
        state.opened(true)
        state.config(config)
    },
    hide() {
        state.opened(false)
        Maybe(config('onclose')).map(R.call)
    },
    view() {
        return state.opened() ? m('.jn-modal.jn-modal--show.jn-modal--scale-in', config(['class']), [
            m('.jn-modal__wrapper', [
                m('header.jn-modal__header', m('h3', config('title')), m('span.jn-modal__close', { onclick: Modal.hide }, util.svg('x'))),
                m('section.jn-modal__content', createM(config('body'))),
                config('buttons') ? m('footer.jn-modal__footer', config('buttons').map((b) => m('button.jn-button', { onclick: b.callback }, b.label))) : null
            ]),
        ]) : null
    }
}

export default Modal