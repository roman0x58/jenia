'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../util'

const BaseField = u.toM(({ attrs }) => m(`.${attrs.cls}-input-${attrs.name}.jn-form__input.jn-form__${attrs.type}`,
    m('label', { for: attrs.name }, [
        m('.jn-form__input-label-name', attrs.label),
        attrs.desc ? m('.jn-form__input-label-description', attrs.desc) : null
    ]),
    m('input', {
        name: attrs.name,
        id: attrs.name,
        type: attrs.type,
        [attrs.fn]: m.withAttr(attrs.prop, attrs.value),
        [attrs.prop]: attrs.value()
    }), attrs.children))

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