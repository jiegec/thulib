/**
 * Created by XiYe on 12/1/2016.
 */
const rp = require('./util').rp
const ci = require('cheerio-without-node-native')
const iconv = require('iconv-lite')
const sleep = require('es6-sleep').promise

const AuthUtil = require('./auth')
class CurriculumUtil {

  static async parseWeekStr(s) {
    const range = (start, end, stride = 1) => {
      if (isNaN(start) || isNaN(end)) {
        throw 'Unknown Curriculum Week Format Exception'
      }
      const x = []
      for (let i = start; i <= end; i += stride) {
        x.push(i)
      }
      return x
    }

    const parseMultiGroupWeek = (s) => {
      let week = []
      const weekSlices = s.split(/[ ]*[,，][ ]*|周/).slice(0, -1)
      weekSlices.forEach((ele) => {
        let startWeek = null
        let endWeek = null
        const index = ele.indexOf('-')
        if (index !== -1) {
          startWeek = parseInt(ele.slice(0, index))
          endWeek = parseInt(ele.slice(index + 1))
        } else {
          startWeek = parseInt(ele)
          endWeek = startWeek
        }
        week = week.concat(range(startWeek, endWeek))
      })
      return week
    }

    let week = []
    switch (s) {
    case '全周':
      week = range(1, 16)
      break
    case '前八周':
      week = range(1, 8)
      break
    case '后八周':
      week = range(9, 16)
      break
    case '单周':
      week = range(1, 16, 2)
      break
    case '双周':
      week = range(2, 16, 2)
      break
    default:
      week = parseMultiGroupWeek(s)
      break
    }

    const weekFlag = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (const i in week) {
      weekFlag[week[i] - 1] = 1
    }
    return weekFlag
  }

  static async parseFirstLevelCurriculum($) {
    if (!$('title').text().includes('清华大学信息门户')) {
      throw 'Fail To Crawl Curriculum'
    }
    const classes = []
    $('.kc_div').each( async(i, elem) => {
      const course = {}

      //Course ID and Time
      const classStr = $(elem).attr('class').split(' ')[1]
      const courseSequence = parseInt(classStr.slice(10))
      const courseID = `2016-2017-1-${classStr.slice(2, 10)}-${courseSequence}`
      const time = [parseInt(classStr[0]), parseInt(classStr[1])]
      //Course Name
      const courseName = $(elem).find('h5').first().children().first().text()
      //Teacher
      const teacherStr = $(elem).find('h5').first().children().last().text()
      const teacher = teacherStr.slice(0, teacherStr.indexOf('&'))

      const li = $(elem).find('li').get(1)
      //Weeks
      let weekStr = $(li).find('span').first().text()
      weekStr = weekStr.slice(weekStr.indexOf('(') + 1, weekStr.indexOf(')'))
      const week = await CurriculumUtil.parseWeekStr(weekStr)

      //Classroom
      const classroom = $(li).find('span').last().text()

      course.coursename = courseName
      course.teacher = teacher
      course.courseid = courseID
      course.time = time
      course.classroom = classroom
      course.week = week
      // console.log(course)
      classes.push(course)
    })
    return classes
  }

  static async getFirstLevelCurriculum(username, password, isUndergraduate) {
    const prefix = 'http://zhjw.cic.tsinghua.edu.cn'
    const curriculumUndergraduateFirstLevelUrlMobile =
          `${prefix}/portal3rd.do?m=bks_yjkbSearch&mobile=true`
    const curriculumGraduateFirstLevelUrlMobile =
          `${prefix}/portal3rd.do?m=yjs_kbSearch&mobile=true`
    const ticket = await AuthUtil.getTicket(username, password, 'ALL_ZHJW')
    const loginUrl =
          `http://zhjw.cic.tsinghua.edu.cn/j_acegi_login.do?ticket=${ticket}`

    const cookies = rp.jar()
    const loginOptions = {
      method: 'GET',
      uri: loginUrl,
      jar: cookies
    }

    const curriculumOptions = {
      method: 'GET',
      uri: isUndergraduate ?
        curriculumUndergraduateFirstLevelUrlMobile:
        curriculumGraduateFirstLevelUrlMobile,
      jar: cookies,
      encoding: null,
      transform: function (body) {
        const html = iconv.decode(body, 'GBK')
        // console.log(html)
        return ci.load(html, {decodeEntities: false})
      }
    }

    try {
      await rp(loginOptions)
      //Wait for ticket take effect
      await sleep(2000)
      const $ = await rp(curriculumOptions)
      return await CurriculumUtil.parseFirstLevelCurriculum($)
    } catch (e) {
      throw e
    }
  }
}

module.exports = CurriculumUtil
