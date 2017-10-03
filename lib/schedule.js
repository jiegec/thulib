/**
 * Created by XiYe on 12/8/2016.
 */

const rp = require('./util').rp
const sleep = require('es6-sleep').promise
const moment = require('moment')

const AuthUtil = require('../thulib/auth')
class ScheduleUtil {
  static async parseSchedule(resp) {
    if (!resp.includes('no_such_method')) {
      throw 'Fail to Crawl Schedule'
    }
    const jsonStr = resp.slice(15, resp.length - 1)
    const rawSchedules = JSON.parse(jsonStr)
    const schedules = []
    rawSchedules.forEach((item) => {
      const parsedItem = {}
      parsedItem['place'] = item['dd']
      parsedItem['type'] = item['fl']
      parsedItem['startTime'] = item['kssj']
      parsedItem['dueTime'] = item['jssj']
      parsedItem['date'] = item['nq']
      parsedItem['content'] = item['nr']
      parsedItem['description'] = item['sm']
      schedules.push(parsedItem)
    })
    return schedules
  }

  static async splitSemesterSchedule(semesterSchedule) {
    const weeks = ScheduleUtil.NUM_OF_WEEK
    let weekEndMoment = ScheduleUtil.UNDERGRADUATE_SEMESTER_START_DATE.clone()
    weekEndMoment = weekEndMoment.add(6, 'days')

    const weekSchedules = []
    for (let i = 0; i < weeks; ++i) {
      const weekEndStr = weekEndMoment.format('YYYY-MM-DD')
      const before = (ele) => {
        return ele['date'] <= weekEndStr
      }
      const after = (ele) => {
        return ele['date'] > weekEndStr
      }
      const beforeIndex = semesterSchedule.findIndex(before)
      const afterIndex= semesterSchedule.findIndex(after)
      if (beforeIndex === -1) { //beforeIndex === -1
        weekSchedules.push([])
      } else if(afterIndex === -1){ //before index != -1
        const weekSchedule = semesterSchedule.slice(0)
        semesterSchedule = []
        weekSchedules.push(weekSchedule)
      } else {
        const weekSchedule = semesterSchedule.slice(0, afterIndex)
        semesterSchedule = semesterSchedule.slice(afterIndex)
        weekSchedules.push(weekSchedule)

      }
      weekEndMoment = weekEndMoment.add(7, 'days')
    }
    return weekSchedules
  }

  static async getSchedule(username, password, isUndergraduate, currentWeek) {
    const prefix = 'http://zhjw.cic.tsinghua.edu.cn/jxmh.do'
    let startMoment = ScheduleUtil.UNDERGRADUATE_SEMESTER_START_DATE.clone()
    startMoment = startMoment.add(currentWeek - 1, 'weeks')
    const  startDate = startMoment.format('YYYYMMDD')
    const endDate = ScheduleUtil.UNDERGRADUATE_SEMESTER_END_DATE.format('YYYYMMDD')
    const scheduleUndergraduateArgs =
          `?m=bks_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}` +
          '\&jsoncallback=no_such_method'
    const scheduleGraduateArgs =
          `?m=yjs_jxrl_all&p_start_date=${startDate}&p_end_date=${endDate}`+
          '\&jsoncallback=no_such_method'
    const ticket = await AuthUtil.getTicket(username, password, 'ALL_ZHJW')
    await sleep(2000)
    const loginUrl =
          `http://zhjw.cic.tsinghua.edu.cn/j_acegi_login.do?ticket=${ticket}`
    const scheduleUrl = prefix +
          (isUndergraduate ? scheduleUndergraduateArgs: scheduleGraduateArgs)
    const cookies = rp.jar()


    const loginOptions = {
      method: 'GET',
      uri: loginUrl,
      jar: cookies
    }

    const scheduleOptions = {
      method: 'GET',
      uri: scheduleUrl,
      jar: cookies,
    }

    try {
      await rp(loginOptions)
      //Wait for ticket take effect
      await sleep(2000)
      const resp = await rp(scheduleOptions)
      const semesterSchedule = await ScheduleUtil.parseSchedule(resp)
      const weekSchedules = await ScheduleUtil.splitSemesterSchedule(semesterSchedule)
      return weekSchedules
    } catch (e) {
      throw e
    }
  }
}

ScheduleUtil.UNDERGRADUATE_SEMESTER_START_DATE = moment('2016-09-12')
ScheduleUtil.UNDERGRADUATE_SEMESTER_END_DATE = moment('2017-01-15')
ScheduleUtil.NUM_OF_WEEK = 18

module.exports = ScheduleUtil
