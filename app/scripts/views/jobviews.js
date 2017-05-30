'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../components/util'
import flyd from 'flyd'

const viewclick = (vnode, view, i) => {
    vnode.state.active(i)
    vnode.attrs.onclick(view)
}

export let JobViews = {
    oninit(vnode) {
        vnode.state.items  = vnode.attrs.views
        vnode.state.active = flyd.stream(vnode.attrs.active)
    },
    view(vnode) {
        return m('ul.jn-jobv',
            vnode.state.items().map((view, i) =>
                m('li.jn-jobv__item', { key: i, onclick: R.partial(viewclick, [vnode, view, i]), className: u.classy({ 'jn-jobv__item--active' : vnode.state.active() === i  }) }, view.name)
            )
        )
    }
}