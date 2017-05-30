'use strict'

import m from 'mithril'
import u from '../components/util'
import { Tip } from '../components/tooltip'
import { shared } from '../app'
import flyd from 'flyd'
import { checkForUpdates, syncing, updateAvailable, errors, installUpdate } from '../services/updates'

const AboutBox = {
    view({ attrs, children }) {
        return [
            m('dt', attrs.title),
            m('dd', { onclick: attrs.onclick }, attrs.description, children)
        ]
    }
}

let redraw

export default {
    onremove(){
        redraw.end(true)
    },
    oninit() {
        redraw = flyd.on(m.redraw, syncing)
        checkForUpdates()
    },
    view() {
        return m('.jn-about',
            m('h3', 'About ' + shared.title),
            m('dl.jn-about__content',
                m(AboutBox, { title: 'Version', description: shared.version },
                    syncing() ?
                        u.svg('sync', 'jn-update-sync') :
                        (updateAvailable() ?
                            Tip.with(m('span.jn-update-available', { onclick: installUpdate }, '(Update available)'), 'Install Update & Restart')
                            : errors() ? u.svg('x', 'jn-update-fail') : u.svg('check', 'jn-update-ok'))
                ),
                m(AboutBox, { title: 'Website', description: shared.homepage }),
                m(AboutBox, { title: 'Author', description: shared.author })
            )
        )
    }
}