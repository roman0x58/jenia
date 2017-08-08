'use strict'

import m from 'mithril'
import R from 'ramda'
import flyd from 'flyd'
import dom from './dom'
import util from './util'

// @enum
const positions = ['left', 'right', 'top', 'bottom'].reduce((acc, i) => Object.assign(acc, { [i]: i }), {})

const state = {
    config: flyd.stream({
        content : null,
        target  : null,
        visible : false,
        position: positions.top,
        light   : true
    })
}

const config = util.config(state.config)

const stick = ({ distance = 10, el }) => {
    if (!config('target') || !el) {
        return
    }

    let css = {}
    let rect = config('target').getBoundingClientRect()

    let elSize = el.getBoundingClientRect()
    let tgSize = rect

    switch (config('position')) {
        case positions.left:
            css.left = rect.left - elSize.width - parseInt(distance) + 'px'
            css.top = rect.top + (tgSize.height - elSize.height) / 2 + 'px'
            break
        case positions.right:
            css.left = rect.right + parseInt(distance) + 'px'
            css.top = rect.top + (tgSize.height - elSize.height) / 2 + 'px'
            break
        case positions.top:
            css.left = rect.left + (tgSize.width - elSize.width) / 2 + 'px'
            css.top = rect.top - elSize.height - parseInt(distance) + 'px'
            break
        case positions.bottom:
            css.left = rect.left + parseInt((tgSize.width - elSize.width) / 2) + 'px'
            css.top = rect.top + tgSize.height + parseInt(distance) + 'px'
            break
        default:
            throw new Error('Unknown tip position - ' + config('position'))
    }

    dom.css(el, css)
}

export default {
    classes: {
        'jn-tooltip--light': config('light')
    },
    onupdate(vnode) {
        stick({ el: vnode.dom })
    },
    oncreate() {
        // document.addEventListener('mouseup', (e) => {
        //     if (!String(e.target.className).startsWith('jn-tooltip')) {
        //         state.visible(false)
        //         m.redraw()
        //     }
        // })
    },
    view(vnode) {
        return config('visible') ?
            m('.jn-tooltip', {
                class: `jn-tooltip--${config('position')} jn-tooltip--fade-in-${config('position')} ${util.classy(vnode.state.classes)}`
            }, m('.jn-tooltip__wrapper',
                m('.jn-tooltip__text', m.trust(config('content')))))
        : null
    }
}
export const Tip = {
    with: (el, cfg) => {
        el.attrs.onmouseenter = (e) => {
            config(R.merge({
                target : e.currentTarget,
                visible: true
            })(R.is(String, cfg) ? { content: cfg } : cfg))
        }
        el.attrs.onmouseleave = () => config('visible', false)
        return el
    },
    create: (cfg) => config(cfg)
}