'use strict'
import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import util from '../components/util'
import { streamify } from '../components/util'
import moment from 'moment'
import flyd from 'flyd'
import { calcBuildDuration, Actions } from './joblist'
import filter from 'flyd/module/filter'

// build number is build
const isBuildActive = (selected, build) => selected.map(R.prop('number')).map(R.equals(R.prop('number', build))).getOrElse(false)
const buildResult = (build) => R.toLower(R.equals(build.building, true) ? 'building' : build.result || 'unknown')

const findGitBranches = R.compose(R.toPairs, R.head, R.reject(R.isNil), R.pluck('buildsByBranchName'))
const findGitBranch = R.uncurryN(2, (number) => R.compose(Maybe, R.find(R.compose(R.propEq('buildNumber', number), R.last)), findGitBranches))
const transformBranch = R.lift((branch) => R.merge(R.last(branch), { name: R.head(branch) }), Maybe)
const assocBranch = (build) => R.assoc('branch', R.compose(transformBranch, findGitBranch)(build.number, build.actions), build)
const assocChanges = (build) => R.assoc('changes', Maybe(R.prop('changeSet')(build))
    .map(R.prop('items'))
    .map(R.reverse)
    .chain(i => R.isEmpty(i) ? Maybe.Nothing() : Maybe.Just(i)), build)
const assocParamses = (build) => R.assoc('paramses', R.flatten(R.reject(R.isNil, R.pluck('parameters', build.actions))), build)
const cook = R.lift(R.compose(R.omit(['actions', 'changeSet']), assocParamses, assocBranch, assocChanges), Maybe)
const assocLogText = R.curry((build, logText) => build.map(R.assoc('console', logText)))
const cancelLog = (build) => build().chain(v => Maybe(R.prop('console', v))).map(v => v.end(true))

export const Console = {
    view({ attrs }) {
        return m('.jn-job__console', R.omit('logText')(attrs), m('pre.jn-console-output', m('code', attrs.logText())))
    }
}

const Paramses = {
    view({ attrs: { selected } }) {
        return m('dl.jn-job__parameters', selected.chain(R.prop('paramses')).map((p) => [
            m('dt', p.name),
            m('dd', String(p.value))
        ]))
    }
}

const Changes = {
    view({ attrs: { selected } }) {
        const num = selected.map(R.prop('number'))
        return m('div.jn-job__change-set', selected.chain(R.prop('changes')).map((c) => [
            m('h4.jn-job__change-set-title', 'Last 5 commit messages'),
            m('ul.jn-job__change-set-list', R.take(5, c).map((i) =>
                m('li.jn-job__commit', [
                    m('span.jn-job__commit-id.jn-label', util.svg('git-commit'), R.take(7, i.commitId)),
                    m('span.jn-job__commit-msg', i.msg),
                    m('span.jn-job__commit-author', `<${i.author.fullName}>`),
                ]))
            )
        ]).getOrElse(num.isJust ? 'No changes detected' : 'This job doesn\'t have any builds yet'))
    }
}

const ChangesTab = R.pair('changes', Changes)
const ParamsesTab = R.pair('parameters', Paramses)

export const Job = {
    console: flyd.stream(false),
    selected: flyd.stream(Maybe.Nothing()),
    job: flyd.stream(),
    onremove({ state }) {
        state.console(false)
    },
    consoleToggle(state, dispatcher) {
        state.console(!state.console())
        if (state.selected().isJust && R.equals(state.console(), true)) {
            flyd.combine((log, $s) => R.juxt([cancelLog, $s.end])(state.selected, true), [filter(R.equals(false), state.console)])
            dispatcher
                .dispatch('pullLog', state.job(), state.selected().chain(R.prop('number')))
                .then(assocLogText(state.selected()))
                .then(state.selected)
        }
    },
    selectBuild(state, build, dispatcher) {
        state.console(false)
        dispatcher.dispatch('getBuild', state.job(), build.number).then(R.compose(state.selected, cook, Maybe.of))

    },
    oninit({ state, attrs }) {
        state.job = attrs.job
        state.tab = 'changes'
        state.selected(R.compose(cook, Maybe, R.prop('selected'))(state.job()))
    },
    view({ state, attrs: { dispatcher } }) {
        const selected = state.selected()
        const isActive = R.partial(isBuildActive, [selected])
        const name = R.prop('name', state.job())
        const num = selected.map(R.prop('number'))
        const logText = selected.chain(R.compose(Maybe, R.prop('console')))
        const logIsActive = Maybe.maybe(false, R.compose(R.not, streamify(Boolean), R.prop('end')))(logText)
        const tabs = R.when(() => selected.map(R.prop('paramses')).chain(R.length) > 0, R.append(ParamsesTab))([ChangesTab])

        return m('.jn-job', { class: util.classy({ 'jn-job--console-active': logIsActive }) }, [
            m('.jn-job__current',
                m('.jn-job__info', [
                    m('h3.jn-job__title', `${name} - ${num.map(String).map(R.concat('#')).getOrElse('No builds yet')}`),
                    state.job() ? m(Actions, {
                        job: state.job(),
                        console: {
                            click: () => state.consoleToggle(state, dispatcher)
                        }
                    }) : null
                ]),
                tabs.length > 1 ? m('div.jn-job__tab-menu.jn-button-group', tabs
                    .map(R.head)
                    .map((i) => m('button.jn-button-sm.jn-button-sm--white',
                        {
                            class: util.classy({ 'jn-button-sm--active': R.equals(i, state.tab) }),
                            onclick: () => state.tab = i
                        }, i))) : null,
                m('div.jn-job__tab-content', m(R.prop(state.tab, R.fromPairs(tabs)), { selected })),
                Maybe.maybe(null, logText =>
                    m(Console, { class: util.classy({ 'jn-job__console--hidden': !(state.console()) }), logText })
                )(logText)
            ),
            m('ul.jn-job__builds',
                state.job().builds.map((b) =>
                    m(`li.jn-job-build .jn-job-build--${buildResult(b)}`,
                        {
                            class: isActive(b) ? 'jn-job-build--active' : '',
                            onclick: R.partial(state.selectBuild, [state, b, dispatcher])
                        },
                        R.equals(b.building, true) ? m(`.jn-job-build__progress.jn-job-build__progress--${buildResult(b)}`,
                            { style: { width: calcBuildDuration(b) + '%' } }
                        ) : null,
                        m('span.jn-job-build__number', '#' + b.number),
                        m('span.jn-job-build__date', moment(b.timestamp).fromNow()),
                        isActive(b) && selected.chain(R.prop('branch')).isJust ?
                            m('span.jn-job-build__branch.jn-label', util.svg('git-branch'), R.replace('refs/remotes/', '', selected.chain(R.path(['branch', 'value', 'name'])))) : []
                    )
                )

            )
        ])
    }
}


