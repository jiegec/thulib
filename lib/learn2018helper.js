const rp = require('./util').rp;
const ci = require('./util').ci;
const replace_entities = require('./util').replace_entities
const createTextVersion = require('textversionjs');

class Learn2018HelperUtil {
  constructor(user) {
    this.user = user;
    this.username = user.username;
    this.password = user.getPassword();
    this.cookies = rp.jar();
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
      const ticket =
        redirect.split('=').slice(-1)[0]

      await rp({
        uri: `${
                this.prefix}/b/j_spring_security_thauth_roaming_entry?ticket=${
                ticket}`,
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
      semesters.resultList.push(semesters.result);
      for (let semester of semesters.resultList.map(
          (semester) => semester.xnxq)) {
        const courses = await rp({
          method: 'GET',
          uri: `${
              this.prefix}/b/wlxt/kc/v_wlkc_xs_xkb_kcb_extend/student/loadCourseBySemesterId/${
              semester}`,
          jar: this.cookies,
          json: true
        });
        const type = Number.parseInt(semester.split('-').slice(-1)[0]);
        const year = semester.split('-').slice(0, 2).join('-');
        const season = ['', '秋', '春', '夏'][type];
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
        method: 'GET',
        uri: `${this.prefix}/b/wlxt/kj/wlkc_kjflb/student/pageList?wlkcid=${
            course._courseID}&xszt=1&sidx=wz&sord=asc`,
        jar: this.cookies,
        json: true
      });

      let result = [];
      for (let page of resp.object.rows) {
        let id = page.id;
        const contents = await rp({
          method: 'GET',
          uri: `${this.prefix}/b/wlxt/kj/wlkc_kjxxb/student/kjxxb/${
              course._courseID}/${id}`,
          jar: this.cookies,
          json: true
        });
        for (let document of contents.object) {
          result.push({
            title: replace_entities(document[1]),
            size: document[9],
            desc: document[5],
            updatingTime: new Date(document[6]).getTime(),
            url: `${
                this.prefix}/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=${
                document[7]}`
          })
        }
      }

      return result;
    } catch (e) {
      console.log(e)
      return []
    }
  }

  async getNotices(course) {
    try {
      const resp = await rp({
        method: 'POST',
        uri: `${this.prefix}/b/wlxt/kcgg/wlkc_ggb/student/pageListXs`,
        jar: this.cookies,
        json: true,
        form: {
          aoData: `[{"name":"sEcho","value":1},{"name":"iColumns","value":3},{"name":"sColumns","value":",,"},{"name":"iDisplayStart","value":0},{"name":"iDisplayLength","value":30},{"name":"mDataProp_0","value":"bt"},{"name":"bSortable_0","value":true},{"name":"mDataProp_1","value":"fbr"},{"name":"bSortable_1","value":true},{"name":"mDataProp_2","value":"fbsj"},{"name":"bSortable_2","value":true},{"name":"iSortingCols","value":0},{"name":"wlkcid","value":"${course._courseID}"}]`
        }
      });

      let result = [];
      for (let notice of resp.object.aaData) {
        const content = createTextVersion(replace_entities(notice.ggnrStr));
        result.push({
          title: notice.bt,
          publishTime: new Date(notice.fbsj).getTime(),
          content: replace_entities(content)
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