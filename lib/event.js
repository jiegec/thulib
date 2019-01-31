/**
 * Created by XiYe on 12/6/2016.
 */

const rp = require('./util').rp;
const ci = require('./util').ci;
const iconv = require('iconv-lite');

class EventUtil {
  static getEventList() {
    return EventUtil._events;
  }

  static async parseEvents($) {
    if (!$('h3').text().includes('倒计时通知')) {
      throw 'Fail To Crawl Events';
    }
    const events = [];
    $('li').each(async (i, elem) => {
      const event = {};
      const rawStr = $(elem).text();

      // name
      const name = $(elem).find('span').text();
      const daysStr = $(elem).find('b').text();

      // days
      let days = parseInt(daysStr);
      days = isNaN(days) ? 0 : days;

      // status
      const removed = rawStr.replace(name, '');
      const status = removed.includes('开始') ? 'begin' : 'end';

      event.name = name;
      event.remainingdays = days;
      event.status = status;

      events.push(event);
    });

    return events;
  }

  static async fetch() {
    const prefix = 'http://zhjw.cic.tsinghua.edu.cn/';
    const eventUrl = `${prefix}portal3rd.do?url=/portal3rd.do&m=tsxx`;
    console.log('Fetching Events');
    const options = {
      method: 'GET',
      uri: eventUrl,
      encoding: null,
      transform(body) {
        const html = iconv.decode(body, 'GBK');
        return ci.load(html, { decodeEntities: false });
      },
    };

    try {
      const $ = await rp(options);
      EventUtil._events = await EventUtil.parseEvents($);
      console.log('Succeed to update Events');
    } catch (e) {
      console.log(e);
      console.log('Fail to update Events');
      throw e;
    }
  }
}

EventUtil._events = [];
module.exports = EventUtil;
