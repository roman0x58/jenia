'use strict'
import m from 'mithril'
import Input from './input'
import R from 'ramda'

export default {
    view({ attrs }) {
        let cls = attrs.formCls,
            inputs = attrs.fields
        return m(`form.${cls}.jn-form`, { onsubmit: (e) =>{
            e.preventDefault()
            if(attrs.onsubmit) attrs.onsubmit(e)
        } }, inputs.map(field => m(Input, R.merge(field, { cls }))))
    }
}