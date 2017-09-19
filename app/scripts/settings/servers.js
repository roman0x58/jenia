'use strict'
import R from 'ramda'
import m from 'mithril'
import dispatcher from '../dispatcher'
import u from '../components/util'
import { Tip } from '../components/tooltip'

export default {
    view({ attrs }) {
        return m('table.jn-table.jn-servers', [
            m('thead.jn-table__thead', m('tr', [
                m('th.jn-table__th', 'Server Name'),
                m('th.jn-table__th', 'User'),
                m('th.jn-table__th'),
                m('th.jn-table__th')
            ])),
            m('tbody.jn-table__tbody', [
                attrs.model.servers().map(i =>
                    m('tr.jn-table__row', [
                        m('td.jn-table__td', i.server),
                        m('td.jn-table__td', i.login),
                        m('td.jn-table__td', R.equals(true, i.default) ? m('.jn-servers__default-label', 'auto login') : null),
                        m('td.jn-table__td', m('.jn-table__actions',
                            m('ul.jn-actions',
                                Tip.with(
                                    m('li.jn-actions__action', { onclick: () => dispatcher.dispatch('settings.del', 'servers', i) }, u.svg('x'))
                                , 'Remove')
                            )
                        ))
                    ])
                )
            ])
        ])
    }
}