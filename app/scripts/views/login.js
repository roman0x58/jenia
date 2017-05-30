'use strict'

import m from 'mithril'
import u from '../components/util'
import flyd from 'flyd'
import R from 'ramda'

const sBox = {
    hidden: flyd.stream(false),
    selected: flyd.stream(0),
    suggestions: []
}

const keycode = {
    TAB: 27,
    UP: 38,
    DOWN: 40,
    ENTER: 13,
}

const fill = (vm, server) => R.forEachObjIndexed((v, k) => flyd.isStream(v) ? v(server[k]) : null, vm)
const startsWith = (str, prop) => R.propSatisfies(R.invoker(1, 'startsWith')(str), prop)
const checkInView = (el, container) => {
    let cTop = container.scrollTop
    let cBottom = cTop + container.offsetHeight

    let elTop = el.offsetTop - container.offsetTop
    let elBottom = elTop + el.offsetHeight

    return R.and(R.lte(cTop, elTop), R.gte(cBottom, elBottom))
}
let isUp = false,
    isMouseOver = false
const scrollToView = (el) => {
    if (!checkInView(el, el.parentNode)) {
        let elPos = el.offsetTop + el.offsetHeight
        let scrollTop = elPos - el.parentNode.offsetTop - el.parentNode.clientHeight
        el.parentNode.scrollTop = isUp ? el.offsetTop - el.parentNode.offsetTop : scrollTop
    }
}
const processKeyPress = R.curry((vm, e) => {
    switch (e.keyCode) {
        case keycode.TAB: {
            e.preventDefault()
            sBox.hidden(true)
        }
            break
        case keycode.DOWN: {
            e.preventDefault()
            isUp = false
            isMouseOver = false
            const idx = R.inc(sBox.selected())
            sBox.selected(R.equals(idx, sBox.suggestions.length) ? 0 : idx)
        }
            break
        case keycode.UP: {
            e.preventDefault()
            isUp = true
            isMouseOver = false
            const idx = R.dec(sBox.selected())
            sBox.selected(R.lt(idx, 0) ? sBox.suggestions.length - 1 : idx)
        }
            break
        case keycode.ENTER: {
            if (sBox.suggestions.length > 0) {
                e.preventDefault()
                fill(vm, R.nth(sBox.selected(), sBox.suggestions))
            }
        }
            break
    }
})

export let Login = {
    model: function ({ server = '', login = '', password = '' } = {}) {
        this.server = flyd.stream(server)
        this.login = flyd.stream(login)
        this.password = flyd.stream(password)
        this.default = flyd.stream(false)
        this.toJSON = () => R.map(R.invoker(0, 'toJSON'), R.omit(['toJSON', 'suggestions'], this))
    },
    oninit: function (vnode) {
        vnode.state = new Login.model(vnode.attrs.state)
        flyd.on((v) => {
            if (v && v.length >= 3) {
                sBox.suggestions = R.filter(R.both(startsWith(v, 'server'), R.complement(R.propEq('server', v))))(vnode.attrs.settings.servers())
            }
            else {
                sBox.suggestions = []
            }
        }, vnode.state.server)

        vnode.submit = function (e) {
            e.preventDefault()
            vnode.attrs.onsubmit(vnode.state.toJSON())
        }
    },
    view: function (vnode) {
        let vm = vnode.state,
            hasSuggestions = Boolean(sBox.suggestions.length)
        return m('div.jn-login',
            m('form.jn-login-form.jn-form', [
                m('.jn-logo'),
                m('.jn-form__input', [
                    m('label[for=server]', 'Server address'),
                    m('input[name=server][type=text]', {
                        oninput: m.withAttr('value', vm.server),
                        onkeydown: processKeyPress(vm),
                        value: vm.server()
                    }),
                    hasSuggestions && sBox.hidden() ? m('span.jn-suggestion-link', { onclick: () => sBox.hidden(false) }, 'SG') : null,
                    m('ul.jn-suggestion-box', {
                        tabindex: 0,
                        class: u.classy({ 'jn-suggestion-box--hidden': sBox.hidden() || !hasSuggestions }),
                        onkeydown: processKeyPress(vm)
                    },
                        m('.jn-suggestion-box__title', ['Suggesstions', u.svg('x', 'jn-suggestion-box__close-tool', () => sBox.hidden(true))]),
                        m('.jn-suggestion-box__results',
                            sBox.suggestions.map((i, idx) => m('li.jn-suggestion-box__item',
                                {
                                    class: u.classy({ 'jn-suggestion-box__item--selected': R.equals(idx, sBox.selected()) }),
                                    key: idx,
                                    onmouseover: () => {
                                        isMouseOver = true
                                        sBox.selected(idx)
                                    },
                                    onupdate: (vnode) => {
                                        if (R.equals(idx, sBox.selected()) && !isMouseOver) {
                                            scrollToView(vnode.dom)
                                        }
                                    },
                                    onclick: (e) => {
                                        e.preventDefault()
                                        fill(vm, i)
                                    }
                                },
                                m('span.jn-suggestion-box__label', `${i.server} (${i.login})`)
                            )))
                    )
                ]),
                m('.jn-form__input', [
                    m('label[for=login]', 'Login'),
                    m('input[name=login][type=text]', { oninput: m.withAttr('value', vm.login), value: vm.login() })
                ]),
                m('.jn-form__input', [
                    m('label[for=password]', 'Password'),
                    m('input[name=password][type=password]', { oninput: m.withAttr('value', vm.password), value: vm.password() })
                ]),
                m('.jn-form__input.jn-form__checkbox', [
                    m('label[for=default]', 'Stay signed in'),
                    m('input[id=default][name=default][type=checkbox]', { onchange: m.withAttr('checked', vm.default), checked: vm.default() }),
                    m('.jn-form__checkbox-indicator')
                ]),
                m('footer', [
                    m('button.jn-login-form__connect-btn', { onclick: vnode.submit }, 'Connect')
                ])
            ]))
    }
}