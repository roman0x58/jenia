'use strict'

import R from 'ramda'

export default {
    css: (dom, styles) => R.forEach((k) => dom.style[k] = styles[k], R.keys(styles)),
    cls: (el, cls, enable) => {
        el = el.dom || el
        if (R.equals(enable, false)) {
            el.classList.remove(cls)
        } else {
            el.classList.add(cls)
        }

    },
    mod: (el, mod, enable) => {
        el = el.dom || el
        if (R.equals(enable, false)) {
            let cls = R.last(el.classList)
            el.classList.remove(cls)
        } else {
            let cls = R.head(el.classList)
            el.classList.add(`${cls}--${mod}`)
        }
        return el
    }
}