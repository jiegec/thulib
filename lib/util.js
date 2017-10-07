const extend = require('extend')
const XMLHttpRequestPromise = require('xhr-promise')
const URLSearchParams = require('url-search-params')

// Taken from request
FakeRP = (uri, options, callback) => {
    if (typeof options === 'function') {
        callback = options
    }

    let params = {}
    if (typeof options === 'object') {
        extend(params, options, {uri: uri})
    } else if (typeof uri === 'string') {
        extend(params, {uri: uri})
    } else {
        extend(params, uri)
    }

    params.callback = callback || params.callback

    let data = new URLSearchParams()
    for(let k in params.form) {
        data.append(k,params.form[k]);
    }

    return new XMLHttpRequestPromise().send({
        method: params.method,
        header: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        url: params.uri,
        data: data.toString()
    }).then((result) => {
        if(result.status != 200)
            throw new TypeError("Request failed")
        if(typeof params.transform === 'undefined')
            return result.responseText
        else
            return params.transform(result.responseText)
    })
}

FakeRP.jar = () => {}

module.exports = {rp:FakeRP}
