/* Created by Songzhou Yang */

const rp = require('./util').rp
const ci = require('./util').ci
const replace_entities = require('./util').replace_entities
const createTextVersion = require('textversionjs')

class LearnHelperUtil {
  constructor(user) {
    this.user = user
    this.username = user.username
    this.password = user.getPassword()
    this.cookies = rp.jar()
    this.prefix = 'http://learn.tsinghua.edu.cn'
  }

  async login() {
    return await rp({
      method: 'POST',
      uri: `${this.prefix}/MultiLanguage/lesson/teacher/loginteacher.jsp`,
      form: {
        userid: this.username,
        userpass: this.password
      },
      jar: this.cookies
    })
  }

  async getCourseList() {
    try {
      // previous semester, current semester and next semester
      let ps = [];
      for (let typepage of [1, 2, 7]) {
        const $ = await rp({
          method: 'GET',
          uri: `${this.prefix}/MultiLanguage/lesson/student/MyCourse.jsp?language=cn&typepage=${typepage}`,
          jar: this.cookies,
          transform: (body) => {
            return ci.load(body, {
              decodeEntities: false
            })
          }
        })

        ps = ps.concat(Array.from($('.info_tr, .info_tr2')).map(tr => new Promise(async (resolve) => {
          const $this = $(tr)
          const course = {}

          course.courseName = $this.find('a').text().trim()

          const url = $this.find('a').attr('href')
          if (url.indexOf('learn.cic.tsinghua.edu.cn') !== -1) {
            course.courseID = url.split('/').slice(-1)[0]
            course._courseID = course.courseID
            course.site = 'learn2015'
          } else {
            const courseID = url.split('=').slice(-1)[0]
            const isLearn2018 = await rp({
              method: 'GET',
              uri: `${this.prefix}/MultiLanguage/lesson/student/course_locate.jsp?course_id=${courseID}`,
              jar: this.cookies,
              transform: (body, res) => {
                return body.indexOf('learn2018.tsinghua.edu.cn') !== -1;
              }
            });
            if (isLearn2018) {
              course.site = 'learn2018';
            } else {
              course.site = 'learn2001';
            }

            const _$ = await rp({
              method: 'GET',
              uri: `${this.prefix}/MultiLanguage/lesson/student/course_info.jsp?course_id=${courseID}`,
              jar: this.cookies,
              transform: (body) => {
                return ci.load(body, {
                  decodeEntities: false
                })
              }
            })
            const courseNum = _$('#table_box .tr_1').eq(0).text().trim()
            const courseSeq = _$('#table_box .tr_1').eq(1).text().trim()
            course.teacher = _$('#table_box .tr_1').eq(4).text().replace(/&nbsp;/gi, '').trim()
            course.email = _$('#table_box .tr_1').eq(5).text().replace(/&nbsp;/gi, '').trim()
            course.phone = _$('#table_box .tr2').eq(4).text().replace(/&nbsp;/gi, '').trim()
            const _semester = course.courseName.split(/[(]|[-]/).slice(-2)
            const start = _semester[0]
            const end = _semester[1].slice(0, 4)
            const season = _semester[1].charAt(4) === '秋' ? '1' : '2'
            course.courseID = `${start}-${end}-${season}-${courseNum}-${courseSeq}`
            course._courseID = courseID
          }

          course.unsubmittedOperations = parseInt($this.find('.red_text').eq(0).text())
          course.unreadNotice = parseInt($this.find('.red_text').eq(1).text())
          course.newFile = parseInt($this.find('.red_text').eq(2).text())

          resolve(course)
        })));

      }

      return await Promise.all(ps)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  async getDocuments(course) {
    try {
      const $ = await rp({
        method: 'GET',
        uri: `${this.prefix}/MultiLanguage/lesson/student/download.jsp?course_id=${course._courseID}`,
        jar: this.cookies,
        transform: (body) => {
          return ci.load(body, {
            decodeEntities: false
          })
        }
      })

      const docs = []
      $('.tr1, .tr2').each((i, ele) => {
        const $this = $(ele)
        const doc = {}

        const $children = $this.children()
        doc.title = $children.eq(1).text().replace(/&nbsp;/gi, '').trim()
        doc.explanation = $children.eq(2).text().replace(/&nbsp;/gi, '').trim()
        doc.size = $children.eq(3).text().replace(/&nbsp;/gi, '').trim()
        const updatingTime = $children.eq(4).text().replace(/&nbsp;/gi, '').trim()
        doc.updatingTime = new Date(`${updatingTime} 00:00:00`).getTime()
        if (Number.isNaN(doc.updatingTime)) {
          doc.updatingTime = 0
        }
        doc.state = $children.eq(5).text().replace(/&nbsp;/gi, '').trim()

        doc.url = this.prefix + $this.find('a').attr('href')

        doc.state = doc.state !== '' ? 'new' : 'previous'

        docs[i] = doc
      })
      return docs
    } catch (e) {
      throw e
    }
  }

  async getAssignments(course) {
    try {
      const $ = await rp({
        method: 'GET',
        uri: `${this.prefix}/MultiLanguage/lesson/student/hom_wk_brw.jsp?course_id=${course._courseID}`,
        jar: this.cookies,
        transform: (body) => {
          return ci.load(body, {
            decodeEntities: false
          })
        }
      })

      const ps = Array.from($('.tr1, .tr2')).map((tr) => new Promise(async (resolve) => {
        const $this = $(tr)
        const assignment = {}

        const $children = $this.children()
        assignment.title = $children.eq(0).text().replace(/&nbsp;/gi, '').trim()
        const startDate = $children.eq(1).text().replace(/&nbsp;/gi, '').trim()
        assignment.startDate = new Date(`${startDate} 00:00:00`).getTime()
        const dueDate = $children.eq(2).text().replace(/&nbsp;/gi, '').trim()
        assignment.dueDate = new Date(`${dueDate} 23:59:59`).getTime()
        assignment.state = $children.eq(3).text().replace(/&nbsp;/gi, '').trim()
        assignment.size = $children.eq(4).text().replace(/&nbsp;/gi, '').trim()

        const homeworkPrefix = 'http://learn.tsinghua.edu.cn/MultiLanguage/lesson/student/'
        const _url = $children.eq(0).find('a').attr('href').replace(/amp;/gi, '')

        assignment.assignmentID = _url.split(/&|=/).slice(-5)[0]

        let oldAssignment
        if (course && course.assignments) {
          oldAssignment = course.assignments.find((ass) => ass.assignmentID === assignment.assignmentID)
        }
        if (oldAssignment) {
          resolve(oldAssignment)
        } else {
          const $1 = await rp({
            method: 'GET',
            uri: homeworkPrefix + _url,
            jar: this.cookies,
            transform: (body) => {
              return ci.load(body, {
                decodeEntities: false
              })
            }
          })

          assignment.detail = $1('#table_box .tr_2').eq(1).text().replace(/&nbsp;/gi, '').trim()
          assignment.filename = $1('#table_box .tr_2').eq(2).text().replace(/&nbsp;/gi, '').trim()
          assignment.fileURL = $1('#table_box .tr_2').eq(2).find('a').attr('href')
          assignment.fileURL = !assignment.fileURL ? '' : this.prefix + assignment.fileURL

          const $2 = await rp({
            method: 'GET',
            uri: homeworkPrefix + _url.replace('detail', 'view'),
            jar: this.cookies,
            transform: (body) => {
              return ci.load(body, {
                decodeEntities: false
              })
            }
          })

          assignment.evaluatingTeacher = $2('#table_box .tr_12').eq(0).text().replace(/&nbsp;/gi, '').trim()
          let evaluatingDate = $2('#table_box .tr_12').eq(1).text().replace(/&nbsp;/gi, '').trim()
          evaluatingDate = new Date(`${evaluatingDate} 00:00:00`).getTime()
          assignment.evaluatingDate = Number.isNaN(evaluatingDate) ? 0 : evaluatingDate
          assignment.scored = assignment.evaluatingDate !== 0
          assignment.grade = parseFloat($2('#table_box .tr_1').eq(2).text().replace('分', '0').trim())
          assignment.grade = isNaN(assignment.grade) ? -1 : assignment.grade
          assignment.comment = $2('#table_box .tr_12').eq(2).text().replace(/&nbsp;/gi, '').trim()

          resolve(assignment)
        }
      }))

      return await Promise.all(ps)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  async getNotices(course) {
    const noticeUrl = `${this.prefix}/MultiLanguage/public/bbs/getnoteid_student.jsp?course_id=${course._courseID}`

    try {
      const option = {
        method: 'GET',
        uri: noticeUrl,
        jar: this.cookies,
        transform: (body) => {
          return ci.load(body, {
            decodeEntities: false
          })
        }
      }

      const $ = await rp(option)

      const ps = Array.from($('.tr1, .tr2')).map(tr => new Promise(async (resolve) => {
        const tds = Array.from($(tr).find('td'))
        const rawUri = `${this.prefix}/MultiLanguage/public/bbs/${$(tds[1]).find('a').attr('href')}`
        const href = encodeURI(rawUri.replace(/amp;/gi, ''))
        const noticeID = href.split(/&|=/).slice(-3)[0]
        let oldNotice
        if (course && course.notices) {
          oldNotice = course.notices.find((notice) => notice.noticeID === noticeID)
        }
        if (oldNotice) {
          resolve(oldNotice)
        } else {
          const [,
            title,
            publisher,
            _publishTime,
            rawState
          ] = tds.map(td => $(td).text().trim())
          const publishTime = new Date(`${_publishTime} 00:00:00`).getTime()

          const options = {
            method: 'GET',
            uri: href,
            jar: this.cookies,
            transform: (body) => {
              return ci.load(body, {
                decodeEntities: false
              })
            }
          }

          const $notice = await rp(options)
          $notice('#SL_balloon_obj').remove();
          let content_tr = $notice('.tr_l2').eq(1)
          const content = createTextVersion(content_tr.html())

          const state = rawState === '已读' ? 'read' : 'unread'
          resolve({
            noticeID,
            title: replace_entities(title),
            publisher,
            publishTime,
            state,
            content: replace_entities(content)
          })
        }
      }))

      return await Promise.all(ps)
    } catch (e) {
      console.error(e)
      return []
    }
  }
}

module.exports = LearnHelperUtil