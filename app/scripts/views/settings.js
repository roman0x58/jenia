'use strict'

import m from 'mithril'
import u from '../components/util'
import R from 'ramda'
import flyd from 'flyd'

import ServersPage from '../settings/servers'
import BookmarksPage from '../settings/bookmarks'
import AboutPage from '../settings/about'
import ApplicationPage from '../settings/application'

const state = {
    active: flyd.stream('Servers')
}

const page = R.compose(R.head, R.map(R.last), R.filter(i => R.equals(state.active(), R.head(i))))

export const Settings = {
    oninit({ attrs }) {
        state.active(R.or(attrs.page, 'Servers'))
        state.pages = [
            R.pair('Servers', ServersPage),
            R.pair('Application', ApplicationPage),
            R.pair('About', AboutPage)
        ]
        if (attrs.bookmarks.isJust) {
            state.active(R.or(attrs.page, 'Bookmarks'))
            state.pages = R.prepend(R.pair('Bookmarks', BookmarksPage), state.pages)
        }
    },
    view({ attrs }) {
        return m('.jn-settings', [
            m('.jn-settings__header', [
                m('h3.jn-settings__header-title', 'Settings')
            ]),
            m('ul.jn-settings__menu',
                state.pages
                    .map(R.head)
                    .map(i => m('li.jn-settings__menu-item',
                        {
                            class: u.classy({ 'jn-settings__menu-item--active': R.equals(i, state.active()) }),
                            onclick() { state.active(i) }
                        }, i))
            ),
            m('.jn-settings__content', m(page(state.pages), attrs))
        ])
    }
}