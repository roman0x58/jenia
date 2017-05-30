'use strict'
import m from 'mithril'
import R from 'ramda'
import u from '../components/util'
import { Tip } from '../components/tooltip'
import notifications from '../components/notifications'

export const Queue = {
    cancelQueue(dispatcher, queue){
        dispatcher.dispatch('cancelQueue', queue.id)
            .then(() => dispatcher.dispatch('updateQueue'))
            .then(() => notifications.success('Item has been removed from queue...'))
    },
    view(vnode) {
        return m('.jn-execution-queue', [
            m('span.jn-execution-queue__title', 'Queue '),
            m('ul.jn-execution-queue__list', vnode.attrs.queue().map(i =>
                m('li.jn-execution-queue__item', [
                    m('span.jn-execution-queue__item-name', i.task.name),
                    Tip.with(m('span.jn-execution-queue__item-cancel', { onclick: R.partial(vnode.state.cancelQueue, [vnode.attrs.dispatcher, i]) }, u.svg('x')), 'Cancel')
                ])))
        ])
    }
}