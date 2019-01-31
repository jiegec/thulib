/**
 * Created by tianyizhuang on 30/11/2016.
 */

const rp = require('./util').rp;
const ci = require('./util').ci;

class LibraryUtil {
  static get result() {
    return LibraryUtil._result;
  }

  static async fetch() {
    console.log('Fetching Library');
    try {
      const options = {
        method: 'GET',
        uri: LibraryUtil.HS_ROOMSHOW_URL,
        transform: body => cheerio.load(body),
      };

      const $ = await rp(options);
      const elements = Array
        .from($('td'))
        .slice(5)
        .map(el => $(el).text().trim());

      const areas = [];
      for (let i = 0; i < elements.length; i += 3) {
        areas.push({
          name: elements[i],
          used: parseInt(elements[i + 1]),
          left: parseInt(elements[i + 2]),
        });
      }

      LibraryUtil._result = areas;
      console.log('Succeed to update Library');
    } catch (e) {
      console.error(e);
      console.log('Fail to update Library');
    }
  }
}

LibraryUtil._result = [];
LibraryUtil.HS_ROOMSHOW_URL = 'http://seat.lib.tsinghua.edu.cn/roomshow/';

module.exports = LibraryUtil;
