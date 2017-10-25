'use strict'
import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import util from '../components/util'
import { streamify } from '../components/util'
import moment from 'moment'
import { Tip } from '../components/tooltip'
import flyd from 'flyd'
import { calcBuildDuration, Actions } from './joblist'
import $filter from 'flyd/module/filter'
import modal from '../components/modal'

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
const letters = R.compose(R.toUpper, R.transduce(R.map(R.take(1)), R.concat, ''), R.split(/\s|\./))
const palette = ['1F4E5F', 'e74c3c', 'F5AB35', '571EC3', '52616B', '1F4E5F']
const colors = R.memoize(() => '#' + palette[Math.floor(Math.random() * palette.length)])
const wrapToNode = R.useWith(R.flip(R.append), [R.identity, i => m('div', i)])

// TODO implement occlusion culling for the big console outputs
export const Console = {
    onupdate({ dom, state }) {
        if (state.pinned === true) {
            const el = dom.firstChild
            el.scrollTop = el.scrollHeight
        }
    },
    oninit({ state, attrs }) {
        // Wrap each line to mithril div node, when the log stream gets values,
        // to avoid the big text node rerendering
        const isActive = !attrs.logText.end()
        state.pinned = false
        state.log = isActive ? flyd.scan(wrapToNode, [], attrs.logText) : attrs.logText
    },
    view({ state, attrs }) {
        return m('.jn-console', R.omit('logText')(attrs),
            m('.jn-console-wrapper',
                m('ul.jn-console__tools',
                    m('li.jn-console__tool.jn-console__tool-pin', {
                        onclick: () => state.pinned = !state.pinned,
                        class: util.classy({
                            'jn-console__tool-pin--active': state.pinned
                        })
                    }, util.svg('pin'))
                ),
                m('pre.jn-console-output', m('code', state.log()))
            )
        )
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
            m('ul.jn-job__change-set-list', c.map((i) =>
                m('li.jn-job__commit', [
                    Tip.with(m('span.jn-job__commit-id.jn-label', {
                        onclick: () => modal.show({
                            title: 'Affected paths',
                            class: 'jn-job-affected-paths__modal',
                            body: util.toM(() => {
                                return m('ul.jn-job-affected-paths', R.sortBy(R.prop('editType'), i.paths).map(e => {
                                    const svg = flyd.stream()
                                    switch (e.editType) {
                                        case 'add': svg('diff-added')
                                            break
                                        case 'delete': svg('diff-removed')
                                            break
                                        case 'edit': svg('diff-modified')
                                            break
                                        default: svg('diff')
                                    }
                                    return m('li.jn-job-affected-paths__path', util.svg(svg(), 'jn-job-affected-paths__icon jn-job-affected-paths__icon--' + e.editType), e.file)
                                }))
                            })
                        })
                    }, [
                        util.svg('git-commit'),
                        R.take(7, i.commitId),
                        m('span.jn-job__commit-author', { style: { color: colors(letters(i.author.fullName)) } }, letters(i.author.fullName))
                    ]), moment(i.timestamp).format('DD MMM kk:mm') + '<br/>' + i.author.fullName),
                    m('span.jn-job__commit-msg', i.msg),
                    m('span.jn-job__commit-author', ),
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
            flyd.combine((log, $s) => R.juxt([cancelLog, $s.end])(state.selected, true), [$filter(R.equals(false), state.console)])
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

        return m('.jn-job', { class: util.classy({ 'jn-job--console-active': logIsActive }), key: util.id() }, [
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
                m('div.jn-job__tab-menu.jn-button-group', tabs
                    .map(R.head)
                    .map((i) => m('button.jn-button-sm.jn-button-sm--smoke',
                        {
                            class: util.classy({ 'jn-button-sm--active': R.equals(i, state.tab) }),
                            onclick: () => state.tab = i
                        }, i))),
                m('div.jn-job__tab-content', m(R.prop(state.tab, R.fromPairs(tabs)), { selected })),
                Maybe.maybe(null, logText =>
                    m(Console, {
                        class: util.classy({
                            'jn-job__console': true,
                            'jn-console--hidden': !(state.console())
                        }), logText
                    })
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


