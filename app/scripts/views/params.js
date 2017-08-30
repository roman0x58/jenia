'use strict'

import m from 'mithril'
import R from 'ramda'
import notifications from '../components/notifications'
import flyd from 'flyd'

export default {
    oninit(vnode) {
        vnode.state = R.or(vnode.attrs.state, {})
        vnode.attrs.params.forEach((i) => {
            let val = R.propOr(null, 'value', i.defaultParameterValue)
            if (!R.isNil(vnode.state[i.name])) {
                val = vnode.state[i.name]
            }
            vnode.state[i.name] = flyd.stream(val)
        })
    },
    view(vnode) {
        const paramses = vnode.attrs.params.map((i) => {
            let cs = vnode.state[i.name]
            switch (i.type) {
                case 'ChoiceParameterDefinition':
                    return m('.jn-form__input.jn-form__select.jn-param.jn-param-choice',
                            m('label', { for: i.name }, [
                                m('div.jn-param__name', i.name),
                                m('div.jn-param__description', i.description),
                            ]),
                            m('select', { id: i.name, onchange: m.withAttr('value', cs), value: cs() }, i.choices.map((i) => m('option', i))))
                case 'StringParameterDefinition':
                    return m('.jn-form__input.jn-param.jn-param-string', [
                        m('label', { for: i.name }, [
                            m('div.jn-param__name', i.name),
                            m('div.jn-param__description', i.description),
                        ]),
                        m('input', { name: i.name, id: i.name, type: 'text', onchange: m.withAttr('value', cs), value: cs() })
                    ])
                case 'TextParameterDefinition':
                    return m('.jn-form__input.jn-form__input-textarea.jn-param.jn-param-text', [
                        m('label', { for: i.name }, [
                            m('div.jn-param__name', i.name),
                            m('div.jn-param__description', i.description),
                        ]),
                        m('textarea', { name: i.name, id: i.name, rows: 5, onchange: m.withAttr('value', cs), value: cs() })
                    ])
                case 'BooleanParameterDefinition':
                    return m('.jn-form__input.jn-form__checkbox.jn-param.jn-param-boolean', [
                        m('label', { for: i.name },
                            [
                                m('div.jn-param__name', i.name),
                                m('div.jn-param__description', i.description),
                            ]
                        ),
                        m('input', { name: i.name, id: i.name, onchange: m.withAttr('checked', cs), type: 'checkbox', checked: Boolean(cs()) }),
                        m('.jn-form__checkbox-indicator')
                    ])
                default:
                    notifications.error('Unknown parameter type -' + i.type)
            }
        })
        return m('.jn-pb',
            m('header.jn-pb__header', m('h5', 'The build required next parameters')),
            m('form.jn-pb__form.jn-form', paramses),
            vnode.attrs.buttonText ? m('button.jn-pb__build-button.jn-button', {
                onclick: () => {
                    if (R.is(Function, vnode.attrs.callback)) {
                        vnode.attrs.callback(R.map((v) => v(), vnode.state))
                    }
                }
            }, vnode.attrs.buttonText) : null
        )
    }
}