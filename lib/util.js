let rp = null;

try {
  require('react-native');
  // Taken from request
  const extend = require('extend');
  const URLSearchParams = require('url-search-params');
  const XMLHttpRequestPromise = require('xhr-promise');
  FakeRP = (uri, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }

    const params = {};
    if (typeof options === 'object') {
      extend(params, options, {
        uri,
      });
    } else if (typeof uri === 'string') {
      extend(params, {
        uri,
      });
    } else {
      extend(params, uri);
    }

    params.callback = callback || params.callback;

    const data = new URLSearchParams();
    for (const k in params.form) {
      data.append(k, params.form[k]);
    }

    return new XMLHttpRequestPromise().send({
      method: params.method,
      header: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      url: params.uri,
      data: data.toString(),
    }).then((result) => {
      if (result.status != 200) throw new TypeError('Request failed');
      if (typeof params.transform === 'undefined') return result.responseText;
      return params.transform(result.responseText);
    });
  };

  FakeRP.jar = () => {};
  rp = FakeRP;
} catch (e) {
  rp = require('request-promise');
}


let ci = null;

try {
  require('react-native');
  ci = require('cheerio');
} catch (e) {
  ci = require('cheerio-without-node-native');
}

function replace_entities(content) {
  return content.replace(/&nbsp;/gi, ' ')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&cap;/gi, '∩')
    .replace(/&amp;/gi, '&')
    .replace(/&middot;/gi, '·');
}

module.exports = {
  rp,
  ci,
  replace_entities,
};
