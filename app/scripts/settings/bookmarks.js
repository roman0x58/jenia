'use strict'
import m from 'mithril'
import dispatcher from '../dispatcher'
import u from '../components/util'
import { bookmark } from '../views/joblist'

export default {
    view({ attrs }) {
        return m('table.jn-table.jn-servers', [
            m('thead.jn-table__thead', m('tr', [
                m('th.jn-table__th', 'Bookmark name'),
                m('th.jn-table__th')
            ])),
            m('tbody.jn-table__tbody', [
                attrs.bookmarks.map((v) => v().map(i =>
                    m('tr.jn-table__row', [
                        m('td.jn-table__td', i.name),
                        m('td.jn-table__td', m('.jn-table__actions',
                            m('ul.jn-actions',
                                m('li.jn-actions__action', {
                                    onclick: () => bookmark(i)
                                }, u.svg('pencil')),
                                m('li.jn-actions__action', { onclick: () => dispatcher.dispatch('del', 'bookmarks', i) }, u.svg('x'))
                            )
                        ))
                    ])
                )).getOrElse('null')
            ])
        ])
    }
}