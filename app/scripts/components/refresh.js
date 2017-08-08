'use strict'

import R from 'ramda'
import flyd from 'flyd'
import m from 'mithril'
import { logFactory, streamify } from './util'
import { checkPaths } from './util'
import dispatcher from '../dispatcher'
import notifications from './notifications'
import { dropRepeatsWith } from 'flyd/module/droprepeats'
import $filter from 'flyd/module/filter'
import afterSilence from 'flyd/module/aftersilence'

const call = (...fns) => R.apply(R.pipeP, R.prepend(() => Promise.resolve(m.redraw()), R.map((fn) => () => dispatcher.dispatch(fn), fns)))()
const notify = (job) => notifications.info(`Build #${job.lastBuild.number} for job ${job.name} was ${job.lastBuild.result}`)
const find = R.curry((builds, jobs) => R.reject(R.isNil, R.map((b) => R.find(R.pathEq(['lastBuild', 'number'], b.number), jobs), builds)))
const check = R.curry((arr, predicate, i) => R.findIndex(predicate(i))(arr) !== -1)
const peq = (prop1, prop2) => R.useWith(R.propEq(prop1), [R.path(prop2 ? prop2.split('.') : [prop1])])
const lenEq = R.useWith(R.equals, [R.length, R.length])

const log = logFactory.getLogger('refresh-task')

export const refreshImmediate = () => call('updateQueue', 'checkBuilding')
export const refresh = (model, route) => {
    const eq = p => R.equals(route().name, p)

    const scanned = flyd.scan(R.compose(R.takeLast(2), R.flip(R.append)), [], dropRepeatsWith(R.equals, model.building))
    const finished = $filter(R.complement(R.isEmpty), scanned.map(R.ifElse(R.compose(R.equals(2), R.length), R.apply(R.difference), R.always([]))))

    const localRoute    = afterSilence(2000, $filter(R.flip(checkPaths)(['jobs', 'job']), route))
    const localQueue    = $filter(R.complement(R.isEmpty), afterSilence(1000, model.queue).map(R.flatten))
    const localBuilding = $filter(R.complement(R.isEmpty), afterSilence(3000, model.building).map(R.flatten))

    finished.map((builds) => {
        const namecheck = check(builds, peq('name'))

        if (eq('jobs') && R.any(namecheck, model.jobs())) {
            log.debug('builds were finished | udpate view', builds)
            call('updateView').then(streamify(R.compose(R.forEach(notify), find(builds))))
        }
        else if (eq('job') && namecheck(model.job())) {
            log.debug('builds were finished | udpate job', builds)
            call('updateJob').then(streamify(notify))
        }
        else {
            log.debug('builds were finished | find the builds result', builds)
            const results = build => model.getBuild(build, build.number, { background: true, query: { tree: 'result'} })
                    .then((result) => ({ 'name': build.name, lastBuild : R.merge(result, build)}))

            Promise.all(builds.map(results)).then(R.forEach(notify))
        }
    })

    localRoute.map(() => call('updateQueue', 'checkBuilding'))
    localQueue.map(() => call('updateQueue', 'checkBuilding'))
    localBuilding.map((builds) => {
        const numcheck  = check(builds, peq('number', 'lastBuild.number'))
        const namecheck = check(builds, peq('name'))

        if (eq('job')) {
            if(R.both(namecheck, R.complement(numcheck))(model.job())){
                log.debug('update job | check building ')
                call('updateJob', 'checkBuilding')
            } else {
                log.debug('check building')
                call('checkBuilding')
            }
        }
        if (eq('jobs')) {
            // check whether the view by name of the current building builds && all the last builds in it
            if(R.any(namecheck, model.jobs()) && !lenEq(find(builds, model.jobs()), builds)){
                log.debug('update view | check building ')
                call('updateView', 'checkBuilding')
            }
            else {
                log.debug('check building')
                call('checkBuilding')
            }
        }
    })
    return [localRoute, localQueue, localBuilding]
}