'use strict'

import R from 'ramda'

const dom = {
    css: (dom, styles) => R.forEach((k) => dom.style[k] = styles[k], R.keys(styles)),
    cls: (el, cls, enable) => {
        el = el.dom || el
        if (R.equals(enable, false)) {
            el.classList.remove(cls)
        } else {
            el.classList.add(cls)
        }

    },
    switch: R.curry((mod1, mod2, el) => {
        dom.mod(mod1, el, false)
        dom.mod(mod2, el)
    }),
    mod: R.curryN(2, (mod, el, enable) => {
        el = el.dom || el
        if (R.equals(enable, false)) {
            let cls = R.last(el.classList)
            el.classList.remove(cls)
        } else {
            let cls = R.head(el.classList)
            el.classList.add(`${cls}--${mod}`)
        }
        return el
    })
}

export default dom