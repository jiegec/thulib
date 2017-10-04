const extend = require('extend')
const XMLHttpRequestPromise = require('xhr-promise')

// Taken from request
FakeRP = function(uri, options, callback) {
    if (typeof options === 'function') {
        callback = options
    }

    var params = {}
    if (typeof options === 'object') {
        extend(params, options, {uri: uri})
    } else if (typeof uri === 'string') {
        extend(params, {uri: uri})
    } else {
        extend(params, uri)
    }

    params.callback = callback || params.callback

    var data = new URLSearchParams()
    for(var k in params.form) {
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
            alert("Request failed")
        if(typeof params.transform == 'undefined')
            return result.responseText
        else
            return params.transform(result.responseText)
    })
}

FakeRP.jar = function(){return {};}

module.exports = {rp:FakeRP}
