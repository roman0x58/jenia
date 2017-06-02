'use strict'
import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import util from '../components/util'
import moment from 'moment'
import flyd from 'flyd'
import { calcBuildDuration, Actions } from './joblist'

// build number is selected
const isBuildActive = (selected, n) => selected.map(R.prop('number')).map(R.equals(n)).getOrElse(false)
const buildResult = (build) => R.toLower(R.equals(build.building, true) ? 'building' : build.result || 'unknown')

const findGitBranches = R.compose(R.toPairs, R.head, R.reject(R.isNil), R.pluck('buildsByBranchName'))
const findGitBranch = R.uncurryN(2, (number) => R.compose(Maybe, R.find(R.compose(R.propEq('buildNumber', number), R.last)), findGitBranches))
const transformBranch = R.lift((branch) => R.merge(R.last(branch), { name: R.head(branch) }), Maybe)
const assocBranch = R.lift((build) => R.assoc('branch', R.compose(transformBranch, findGitBranch)(build.number, build.actions), build), Maybe)
const assocChanges = R.lift((build) => R.assoc('changes', Maybe(R.prop('changeSet')(build)).map(R.prop('items')).chain(i => R.isEmpty(i) ? Maybe.Nothing() : Maybe.Just(i)), build), Maybe)
const assocGit = R.compose(assocBranch, assocChanges)
const assocLogText = R.curry((build, logText) => build(build().map(R.assoc('console', logText))))
const cancelLog = (build) => build().chain(v => Maybe(R.prop('console', v))).map(v => v.end(true))

export const Console = {
    view({ attrs }) {
        return m('.jn-job__console', R.omit('logText')(attrs), m('pre.jn-console-output', m('code', attrs.logText())))
    }
}

export const Job = {
    console: flyd.stream(false),
    selected: flyd.stream(Maybe.Nothing()),
    job: flyd.stream(),
    onremove({ state }) {
        state.console(false)
        state.consoleListener.end(true)
    },
    consoleToggle(e, state, dispatcher) {
        state.console(!state.console())
        if (state.selected().isJust && R.equals(state.console(), true)) {
            return dispatcher
                .dispatch('pullLog', state.job(), state.selected().chain(R.prop('number')))
                .then(assocLogText(state.selected))
        }
    },
    selectBuild(state, build, dispatcher) {
        state.console(false)
        dispatcher.dispatch('getBuild', state.job(), build.number)
            .then(R.compose(state.selected, assocGit, Maybe.of))

    },
    oninit({ state, attrs }) {
        state.job = attrs.job
        state.consoleListener = flyd.on(R.when(R.equals(false), () => cancelLog(state.selected)), state.console)
        state.selected(R.compose(assocGit, Maybe, R.prop('selected'))(state.job()))
    },
    view({ state, attrs: { dispatcher } }) {
        const selected = state.selected()
        // git changes
        const isActive = R.partial(isBuildActive, [selected])
        const jobName = R.prop('name', state.job())
        const buildNumber = selected.map(R.prop('number'))
        const logText = selected.chain((v) => Maybe(R.prop('console', v)))
        const activeLog = !logText.map(s => !!s.end()).getOrElse(true)

        return m('.jn-job', {
            class: util.classy({
                'jn-job--console-active': activeLog
            })
        }, [
            m('.jn-job__current',
                    m('.jn-job__info', [
                        m('h3.jn-job__title', `${jobName} - ${buildNumber.map(R.concat('#')).getOrElse('No builds yet')}`),
                        state.job() ? m(Actions, {
                            job: state.job(),
                            console: {
                                click: R.partial(state.consoleToggle, [R.__, state, dispatcher])
                            }
                        }) : null
                    ]),
                    m('div.jn-job__change-set',
                        selected.chain(R.prop('changes')).map((c) => [
                            m('h4.jn-job__change-set-title', 'Last 5 commit messages'),
                            m('ul.jn-job__change-set-list', R.take(5, c).map((i) =>
                                m('li.jn-job__commit', [
                                    m('span.jn-job__commit-id.jn-label', util.svg('git-commit'), R.take(7, i.commitId)),
                                    m('span.jn-job__commit-msg', i.msg),
                                    m('span.jn-job__commit-author', `<${i.author.fullName}>`),
                                ]))
                            )
                        ]).getOrElse(buildNumber.isJust ? 'No changes detected' : 'This job doesn\'t have any builds yet')),
                    logText.map(logstream =>
                        m(Console, { class: util.classy({ 'jn-job__console--hidden': !(state.console()) }), logText: logstream })
                    ).value
                ),
            m('ul.jn-job__builds',
                    state.job().builds.map((build) =>
                        m(`li.jn-job-build .jn-job-build--${buildResult(build)}`,
                            {
                                class: isActive(build.number) ? 'jn-job-build--active' : '',
                                onclick: R.partial(state.selectBuild, [state, build, dispatcher])
                            },
                            R.equals(build.building, true) ? m(`.jn-job-build__progress.jn-job-build__progress--${buildResult(build)}`,
                                { style: { width: calcBuildDuration(build) + '%' } }
                            ) : null,
                            m('span.jn-job-build__number', '#' + build.number),
                            m('span.jn-job-build__date', moment(build.timestamp).fromNow()),
                            isActive(build.number) && selected.chain(i => i.branch).isJust ?
                                m('span.jn-job-build__branch.jn-label', util.svg('git-branch'), R.replace('refs/remotes/', '', selected.map(R.path(['branch', 'value', 'name'])).value)) : []
                        )
                    )

                )
        ])
    }
}


