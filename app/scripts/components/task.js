'use strict'

import R from 'ramda'

export default (taskFn, tm) => {
    let fn
    const stop = () => {
        if (fn) {
            // console.log('[rtask] cancel task with id ', fn.id)
            clearTimeout(fn.id)
            fn.id = null
        }
    }
    const run = (...args) => {
        stop()
        fn = (task) => {
            let p = R.apply(taskFn, args)
            if (R.is(Promise, p)) {
                p.then(() => {
                    // console.log('[rtask] new tick with id', task.id)
                    if (!R.isNil(task.id)) {
                        R.apply(run, args)
                    }
                })
            }
        }
        // pass the current task fn in closure to check if is it running
        fn.id = setTimeout(() => fn(fn), tm)
    }
    return {
        run: run,
        stop: stop
    }
}