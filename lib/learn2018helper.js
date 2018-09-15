const rp = require('./util').rp
const ci = require('./util').ci

class Learn2018HelperUtil {
    constructor(user) {
        this.user = user
        this.username = user.username
        this.password = user.getPassword()
        this.cookies = rp.jar()
        this.prefix = 'http://learn2018.tsinghua.edu.cn'
    }

    async login() {
        try {
            const $ = await rp({
                method: 'POST',
                uri: `https://id.tsinghua.edu.cn/do/off/ui/auth/login/post/bb5df85216504820be7bba2b0ae1535b/0?/login.do`,
                form: {
                    i_user: this.username,
                    i_pass: this.password,
                    atOne: true
                },
                jar: this.cookies,
                transform: (body) => {
                    return ci.load(body, {
                        decodeEntities: false
                    })
                }
            });

            const redirect = $('a').attr('href')
            const ticket = redirect.split('=').slice(-1)[0]

            await rp({
                uri: `${this.prefix}/b/j_spring_security_thauth_roaming_entry?ticket=${ticket}`,
                method: 'GET',
                jar: this.cookies
            });

            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    async getCourseList() {
        try {
            const semesters = await rp({
                method: 'GET',
                uri: `${this.prefix}/b/kc/zhjw_v_code_xnxq/getCurrentAndNextSemester`,
                jar: this.cookies,
                json: true
            })

            let result = [];
            for (let semester of [semesters.result.xnxq, semesters.resultList[0].xnxq]) {
                const courses = await rp({
                    method: 'GET',
                    uri: `${this.prefix}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${semester}`,
                    jar: this.cookies,
                    json: true
                });
                const type = Number.parseInt(semester.split('-').slice(-1)[0]);
                const year = semester.split('-').slice(0, 2).join('-');
                const season = ["", "秋", "春", "夏"][type];
                for (let course of courses.resultList) {
                    result.push({
                        courseID: `${semester}-${course.kch}-${course.kxh}`,
                        _courseID: course.wlkcid,
                        courseNum: course.kch,
                        courseSeq: course.kxh,
                        teacher: course.jsm,
                        courseName: `${course.kcm}(${course.kxh})(${year}${season}季学期)`
                    });
                }
            }
            return result;
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async getDocuments(course) {
        try {
            const resp = await rp({
                method: 'POST',
                uri: `${this.prefix}/b/wlxt/kc/v_kjxxb_wjwjb_search/xspageList`,
                jar: this.cookies,
                json: true,
                form: {
                    aoData: `[{"name":"sEcho","value":1},{"name":"iColumns","value":6},{"name":"sColumns","value":",,,,,"},{"name":"iDisplayStart","value":0},{"name":"iDisplayLength","value":3},{"name":"mDataProp_0","value":"wz"},{"name":"bSortable_0","value":true},{"name":"mDataProp_1","value":"bt"},{"name":"bSortable_1","value":true},{"name":"mDataProp_2","value":"wjlx"},{"name":"bSortable_2","value":true},{"name":"mDataProp_3","value":"wjdx"},{"name":"bSortable_3","value":true},{"name":"mDataProp_4","value":"scsj"},{"name":"bSortable_4","value":true},{"name":"mDataProp_5","value":"function"},{"name":"bSortable_5","value":false},{"name":"iSortingCols","value":0},{"name":"wlkcid","value":"${course._courseID}"}]`
                }
            })

            let result = [];
            for (let document of resp.object.aaData) {
                result.push({
                    title: document.bt,
                    type: document.wjlx,
                    size: document.wjdx,
                    fileName: document.fjmc,
                    updatingTime: new Date(document.scsj).getTime(),
                    url: `${this.prefix}/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=${document.wjid}`
                })
            }

            return result;
        } catch (e) {
            console.log(e)
            return []
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
                    const content = createTextVersion($notice('.tr_l2').eq(1).html())

                    const state = rawState === '已读' ? 'read' : 'unread'
                    resolve({
                        noticeID,
                        title,
                        publisher,
                        publishTime,
                        state,
                        content
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

module.exports = Learn2018HelperUtil