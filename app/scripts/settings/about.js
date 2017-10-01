'use strict'

import m from 'mithril'
import { shared } from '../app'
import { indicator, update } from '../services/updates'

const AboutBox = {
    view({ attrs, children }) {
        return [
            m('dt', attrs.title),
            m('dd', { onclick: attrs.onclick }, attrs.description, children)
        ]
    }
}


export default {
    oninit() {
        update.check()
    },
    view() {
        return m('.jn-about',
            m('h3', 'About ' + shared.title),
            m('dl.jn-about__content',
                m(AboutBox, { title: 'Version', description: shared.version }, indicator()),
                m(AboutBox, {
                    title: 'Website', description: m('a', {
                        href: shared.homepage, onclick: (e) => {
                            e.preventDefault()
                            window.openExternal(e.target.href)
                        }
                    }, shared.homepage)
                }),
                m(AboutBox, { title: 'Author', description: shared.author })
            )
        )
    }
}