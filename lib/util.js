const rp = require('request-promise');

const ci = require('cheerio');

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
