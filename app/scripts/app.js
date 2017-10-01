'use strict'

import m from 'mithril'
import R from 'ramda'
import { Maybe } from 'ramda-fantasy'
import flyd from 'flyd'

import AppModel, { defaultServer, serverPredicate, setting } from './models/app'
import { createModel } from './models/jenkins'
import u, { checkPaths, logFactory, platform, withoutRedraw } from './components/util'
// Components
import notifications from './components/notifications'
import modal from './components/modal'
import tooltip from './components/tooltip'
import mask from './components/mask'
import { burial, resurrect } from './components/cemetery'
import { refresh, refreshImmediate } from './components/refresh'
import dispatcher from './dispatcher'
import { ipc } from './services/ipc'
import { indicator, update } from './services/updates'
// Views
import { Login } from './views/login'
import { Job } from './views/job'
import { JobList } from './views/joblist'
import { JobViews } from './views/jobviews'
import { Queue } from './views/queue'
import { Settings } from './views/settings'
import afterSilence from 'flyd/module/aftersilence'
import mergeAll from 'flyd/module/mergeall'

export const shared = window.shared
const log = logFactory.getLogger('app')
log.setLevel('warn')

const browserWindow = window.currentWindow

// streamValues :: { k: * } -> [stream]
const streamValues = R.map(R.compose(R.filter(flyd.isStream), R.values))

// streamsOf :: { k: * }... -> [stream]
const streamsOf = R.unapply(R.transduce(streamValues, R.concat, []))

const Header = {
    view(vnode) {
        return m('.jn-application__header', { class: R.isEmpty(vnode.children) ? 'jn-application__header--hidden' : '' }, vnode.children)
    }
}

const Body = {
    view(vnode) {
        return m('.jn-application__content', vnode.children)
    }
}

const Footer = {
    view(vnode) {
        return m('.jn-application__footer', [
            m('.jn-application__footer-content', vnode.children),
            m('.jn-application__footer-meta',
                m('span.jn-version', `Version ${shared.version}`), indicator()
            )
        ])
    }
}

const Tool = {
    view({ attrs }) {
        return m('li.jn-tools__item', R.omit(['svg', 'label'])(attrs), [
            u.svg(attrs.svg),
            attrs.label ? m('span.jn-tools__item-label', attrs.label) : null
        ])
    }
}

const Layout = {
    view(vnode) {
        const isActive = checkPaths(AppModel.route())
        const rTools = [
            !isActive('login') && App.model ? m(Tool, {
                onclick: withoutRedraw(() => App.signOut()),
                label: R.prop('server', App.model.jenkins().credentials()),
                svg: 'sign-out'
            }) : null,
            isActive('settings') ? m(Tool, { onclick: App.back, svg: 'arrow-left' }) : m(Tool, {
                onclick: withoutRedraw(() => App.routeTo('settings')),
                svg: 'three-bars'
            })
        ]

        const lTools = [
            m(Tool, { onclick: () => browserWindow.close(), svg: 'x' }),
            m(Tool, { onclick: () => browserWindow.minimize(), svg: 'dash' })
        ]
        return [
            m(`.jn-application.jn-application--${shared.platform}.jn-container`, {
                class: u.classy({
                    'jn-application--focused': browserWindow.isFocused()
                })
            },
                [
                    m('.jn-titlebar', [
                        m('ul.jn-titlebar__tools-left.jn-tools', lTools),
                        m('.jn-titlebar__app-title', shared.title),
                        m('ul.jn-titlebar__tools-right.jn-tools', rTools)
                    ]),
                    m(notifications),
                    vnode.children,
                    m(modal),
                    m(mask),
                    m('.jn-overlay')
                ]
            ),
            m(tooltip)
        ]
    }
}
const ifSetting = (prop, value, trueFn, falseFn = R.identity) => R.ifElse(R.always(R.propEq(prop, value)(AppModel.settings())), trueFn, falseFn)
if (R.either(platform.linux, platform.win32)()) {
    // This will add a focus border to the window
    renderer.on('browser-window-focus', m.redraw)
    renderer.on('browser-window-blur', m.redraw)
}
// refresh application when window has been shown
renderer.on('browser-window-show', () => App.refresh())

// Catch some things from main process
renderer.on('build', (e, v) => App.model.runBuild(v.job, v.job.paramses)
    .then(() => new Notification('Build started', { body: v.name }))
    .then(R.when(R.always(browserWindow.isVisible()), () => App.refresh()))
)
renderer.on('route', (e, v) => App.routeTo(v.path, v.attrs))

const viewIndex = (view) => R.findIndex(R.propEq('name', R.prop('name', view)))(App.model.views())
const kill = R.forEach(R.invoker(1, 'end')(true))
const undefault = (server) => dispatcher.dispatch('settings.default', server, false)

const App = {
    routeTo(r, attrs) {
        return AppModel.route({ 'name': r, 'attrs': R.merge(attrs, { key: u.id('view') }) })
    },
    back() {
        return AppModel.route(R.head(AppModel.history()))
    },
    changeView(v) {
        return dispatcher.dispatch('setView', v).then(() => App.routeTo('jobs', { active: viewIndex(App.model.view()) }))
    },

    showJob(j) {
        return dispatcher.dispatch('setJob', j).then(() => App.routeTo('job', { active: viewIndex(App.model.view()) }))
    },

    signIn(credentials) {
        let model = createModel()
        return model.init(credentials)
            .then(R.tap(() => {
                App.model = resurrect(model, 'app')

                App.streams = []
                App.streams.push(refresh(App.model, AppModel.route, setting('refreshinterval') * 1000))
                App.streams.push(flyd.on(() => burial(model, 'app'), burialTick(model)))
                App.streams.push(flyd.on(ipc('bookmarks'), model.bookmarks))

                dispatcher.dispatch('settings.addOrUpdate', 'servers', ifSetting('saveserverpass', false, R.omit(['password']))(credentials), serverPredicate)
            }))
    },
    signOut() {
        let credentials = App.model.jenkins().credentials()
        undefault(credentials)
        kill(R.flatten(R.concat(App.streams, streamsOf(App.model))))
        // clear bookmarks
        ipc('bookmarks', [])
        delete App.model
        return App.routeTo('login', { state: credentials })
    },

    onLogin(credentials) {
        return App.signIn(credentials)
            .then(R.compose(App.changeView, R.prop('primaryView')))
            .then(() => notifications.success('successfully connected to jenkins'))
    },
    refresh() {
        if (App.model) refreshImmediate(App.model)
    },
    routes: {
        job: (attrs) => [
            m(Header, m(JobViews, R.merge(attrs, { views: App.model.views, onclick: App.changeView }))),
            m(Body, m(Job, { job: App.model.job, dispatcher: dispatcher, key: attrs.key })),
            m(Footer, m(Queue, { queue: App.model.queue, dispatcher: dispatcher }))
        ],
        jobs: (attrs) => [
            m(Header, m(JobViews, R.merge(attrs, { views: App.model.views, onclick: App.changeView }))),
            m(Body, m(JobList, { jobs: App.model.jobs, dispatcher: dispatcher, onclick: App.showJob })),
            m(Footer, m(Queue, { queue: App.model.queue, dispatcher: dispatcher }))
        ],
        settings: (attrs) => [
            m(Body, m(Settings, R.merge(attrs, { model: AppModel, bookmarks: Maybe(App.model).map(R.prop('bookmarks')) })))
        ],
        login: (attrs) => [
            m(Body, m(Login, R.merge(attrs, { settings: AppModel, onsubmit: App.onLogin })))
        ]
    },
    view() {
        const cur = AppModel.route()
        return m(Layout, App.routes[cur.name](cur.attrs))
    }
}

const burialTick = R.compose(afterSilence(50), mergeAll, streamsOf)

const initApp = () => {
    ipc('bookmarks', [])
    const model = resurrect(AppModel, 'global')
    flyd.on(() => burial(model, 'global'), burialTick(model))
    flyd.on(ipc('settings'), model.settings)
    flyd.on(m.redraw, model.route)

    const credentials = defaultServer(model.servers())

    if (credentials) {
        return App.signIn(credentials).catch(() => App.routeTo('login', { state: R.tap(undefault)(credentials) }))
    }
    else {
        return Promise.resolve(App.routeTo('login'))
    }
}
initApp()
    .then(update.check)
    .then(() => m.mount(document.body, App))

export default App