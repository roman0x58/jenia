'use strict'

import m from 'mithril'
import R from 'ramda'
import u from '../components/util'
import { Tip } from '../components/tooltip'
import modal from '../components/modal'
import notifications from '../components/notifications'
import moment from 'moment'
import { Console } from './job'
import Params from './params'
import bookmark from './bookmark'
import dispatcher from '../dispatcher'
import { Maybe } from 'ramda-fantasy'

export const extractJobParams = R.compose(R.reject(R.isNil), R.flatten, R.pluck('parameterDefinitions'), R.reject(R.isNil), u.toArray, R.path(['actions']))

const hasAnime = R.contains('anime')

export const calcBuildDuration = (build) => Math.min((moment().valueOf() - build.timestamp) / build.estimatedDuration * 100, 100)
const Action = {
    view(vnode) {
        return Tip.with(m(`li.jn-job__action.jn-job__action-${vnode.attrs.text.toLowerCase()}`,
            {
                onclick: vnode.attrs.click,
                class: vnode.attrs.class
            }, u.svg(vnode.attrs.icon)), vnode.attrs.text)
    }
}

export const Actions = {
    view({ attrs }) {
        const job = attrs.job
        // let action = (p) => R.ifElse(R.is(Function), R.call, R.identity)(R.path(['action', p])(attrs))
        return m('.jn-job__actions', [
            m('ul.jn-job__actions-list', [
                u.exists(job.lastBuild, R.prop('building')) ? m(Action, {
                    click: (e) => {
                        e.stopPropagation()
                        cancelBuild(job)
                    },
                    icon: 'x',
                    text: 'Cancel'
                }) : m(Action, {
                    click: (e) => {
                        e.stopPropagation()
                        runBuild(job)
                    },
                    icon: 'sync',
                    text: 'Build'
                }),
                m(Action, R.merge({
                    icon: 'terminal',
                    text: 'Console',
                    click: (e) => {
                        e.stopPropagation()
                        dispatcher
                            .dispatch('pullLog', job, job.lastBuild.number)
                            .then((logText) =>
                                modal.show({
                                    title: job.name,
                                    class: 'jn-console-modal',
                                    body: u.toM(() => m(Console, { logText: logText })),
                                    onclose: () => logText.end(true)
                                }))
                    }
                }, attrs.console)),
                m(Action, {
                    icon: 'bookmark',
                    text: 'Bookmark',
                    click: (e) => {
                        e.stopPropagation()
                        bookmark({
                            name: job.name,
                            job: job
                        })
                    }
                })
            ])
        ])
    }
}


const cancelBuild = (job) => {
    return dispatcher
        .dispatch('stopBuild', job, job.lastBuild.number)
        .then(() => notifications.success('The build has been stopped...'))
        .then(() => dispatcher.dispatch('updateQueue'))
}

export const withParamsBuild = (job, opts) => {
    const params = extractJobParams(job)
    return new Promise((resolve) => {
        if (!R.isEmpty(params)) {
            modal.show({
                title: 'Parametrized build',
                body: m(Params, R.merge({
                    params: params,
                    buttonText: 'Build',
                    callback: R.compose(modal.hide, resolve)
                }, opts))
            })
        } else {
            resolve()
        }
    })

}

const runBuild = (job) => {
    const startJob = (paramses) => dispatcher
        .dispatch('runBuild', job, paramses)
        .then(() => notifications.success('The build has been added to a build queue...'))
        .then(() => dispatcher.dispatch('updateQueue'))
    withParamsBuild(job).then(startJob)
}

const icons = {
    'blue': 'check',
    'red': 'flame',
    'aborted': 'x',
    'disabled': 'dash',
    'notbuilt': 'dash'
}

const svgIcon = R.ifElse(hasAnime, R.partial(u.svg, ['package']), R.compose(u.svg, R.flip(R.path)(icons), R.of))

export const JobList = {
    oninit({ state, attrs }) {
        state.items = attrs.jobs
    },
    view({ state, attrs }) {
        return m('table.jn-jobs.jn-table.jn-table--scrollable', [
            m('thead.jn-table__thead', [
                m('tr', [
                    m('th.jn-table__th.jn-jobs__status-cell', 'health'),
                    m('th.jn-table__th.jn-jobs__name-cell', 'name'),
                    m('th.jn-table__th.jn-jobs__actions-cell')
                ])
            ]),
            m('tbody.jn-table__tbody', [
                state.items().map((job) =>
                    m(`tr.jn-table__row.jn-jobs-job.jn-job--${job.color}`, {
                        onclick: R.partial((attrs.onclick), [job])
                    }, [
                        m('td.jn-table__td.jn-jobs__status-cell', [
                            Maybe(job.lastBuild).map(i => i.building).getOrElse(false) ?
                                    m(`.jn-jobs-job__progress.jn-jobs-job__progress--${job.color}`,
                                        { style: { width: calcBuildDuration(job.lastBuild) + '%' } }
                                    ) : null,
                            m(`.jn-jobs-job__status.jn-jobs-job__status--${job.color}`, svgIcon(job.color))
                        ]),
                        m('td.jn-table__td.jn-jobs__name-cell', [
                            m('.jn-jobs-job__name', job.name),
                            m('.jn-jobs-job__url', Maybe(job.lastSuccessfulBuild).map(b => 'Last successful build was ' + moment(b.timestamp).fromNow()).getOrElse(job.url))
                        ]),
                        m('td.jn-table__td.jn-jobs__actions-cell', [
                            m(Actions, { job: job })
                        ])
                    ])
                )
            ]),
        ])
    }
}