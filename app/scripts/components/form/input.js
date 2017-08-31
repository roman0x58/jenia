'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../util'

const validate = (attrs, state) => {
    const type = attrs.type
    const setVal  = (val) => attrs.value(R.is(Function)(type) ? type(val) : val)

    state.errors = []
    if (attrs.validator) {
        const apply = R.curry((val, [fn, error]) => {
            if (R.equals(fn instanceof RegExp ? fn.test(val) : fn(val), true)) {
                state.errors = R.without(error, state.errors)
                setVal(val)
            }
            else {
                state.errors = R.append(error, state.errors)
            }
        })
        return (val) => {
            let validators = attrs.validator
            if (!R.is(Array, R.head(validators))) {
                validators = R.of(validators)
            }
            R.forEach(apply(val), validators)
        }
    }
    return setVal
}

const BaseField = {
    oninit({ state }) {
        state.errors = []
    },
    view({ state, attrs }) {
        return m(`.${attrs.cls}-input-${attrs.name}.jn-form__input.jn-form__${attrs.type}`, {
            class: u.classy({
                'jn-form__input--invalid': state.errors.length > 0
            })
        },
            m('label', { for: attrs.name }, [
                m('.jn-form__input-label-name', attrs.label),
                state.errors.length > 0 ? state.errors.map((e) => m('.jn-form__input-label-error', e)) : (
                    attrs.desc ? m('.jn-form__input-label-description', attrs.desc) : null
                )
            ]),
            m('input', {
                name: attrs.name,
                id: attrs.name,
                type: attrs.type,
                style: { width: attrs.inputWidth },
                [attrs.fn]: m.withAttr(attrs.prop, validate(attrs, state)),
                [attrs.prop]: attrs.value()
            }), attrs.children)
    }
}

export default {
    view({ attrs }) {
        const isType = R.equals(attrs.type)
        if (isType('checkbox')) {
            return m(BaseField, R.merge(attrs, { fn: attrs.fn || 'onchange', prop: 'checked', children: [m('.jn-form__checkbox-indicator')] }))
        }
        if (isType('text')) {
            return m(BaseField, R.merge(attrs, { fn: attrs.fn || 'onchange', prop: 'value' }))
        }
    }
}