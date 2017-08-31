'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../components/util'
import modal from '../components/modal'
import notifications from '../components/notifications'
import flyd from 'flyd'
import Params from './params'
import dispatcher from '../dispatcher'
import { extractJobParams } from './joblist'

const isPhantom = R.compose(R.isNil, R.prop('id'))
const assocId = R.when(isPhantom, (o) => R.assoc('id', u.id(), o))
const read = R.map(R.when(flyd.isStream, R.call))

export default (bookmark) => {
    const defenitions = extractJobParams(bookmark.job)
    const values = R.clone(R.propOr({}, 'paramses', bookmark.job))
    const model = { name: flyd.stream(bookmark.name) }

    modal.show({
        title: isPhantom(bookmark) ? 'Add bookmark' : 'Edit bookmark',
        class: 'jn-bookmark-modal',
        body: u.toM(() => m('.jn-bookmark.jn-form', {
            class: u.classy({ 'jn-bookmark--parametrized': !R.isEmpty(defenitions) })
        },
            m('.jn-bookmark__form',
                m('.jn-form__input', [
                    m('label', { for: 'bookmark' }, 'Bookmark name'),
                    m('input', { name: 'bookmarkName', id: 'bookmarkName', type: 'text', oninput: m.withAttr('value', model.name), value: model.name(), required: true })
                ])
            ),
            !R.isEmpty(defenitions) ? m('.jn-bookmark__params', m(Params, { params: defenitions, state: values })) : null,
            m('button.jn-bookmark__submit.jn-button', {
                onclick: () => {
                    let job = R.assoc('paramses', read(values), bookmark.job)

                    bookmark = R.assoc('name', model.name(), bookmark)
                    bookmark = R.assoc('job', job, bookmark)

                    return Promise.resolve(dispatcher.dispatch('addOrUpdate', 'bookmarks', assocId(bookmark), (v) => R.propEq('id', v.id)))
                        .then(() => notifications.info('Bookmark has been added to tray menu'))
                        .then(modal.hide)
                }
            }, 'Save')
        ))
    })
}