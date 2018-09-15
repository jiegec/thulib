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
}

module.exports = Learn2018HelperUtil