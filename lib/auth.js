const rp = require('./util').rp;

class AuthUtil {
  static async getTicket(username, password, appID) {
    const apiAddress = 'https://id.tsinghua.edu.cn/thuser/authapi/login';
    const loginUrl = `${apiAddress}/${appID}/0_0_0_0`;
    const option = {
      method: 'POST',
      uri: loginUrl,
      formData: {
        username,
        password,
      },
    };
    const resp = JSON.parse(await rp.post(option));
    if (resp.status !== 'RESTLOGIN_OK') {
      throw new Error(resp.status);
    }

    return resp.ticket;
  }

  static async auth(username, password) {
    try {
      await AuthUtil.getTicket(username, password, 'ALL_ZHJW');
      return true;
    } catch (e) {
      return false;
    }
  }

  static _formatUserInfo(rawInfo) {
    const userTypeMap = new Map([
      ['X0031', 'undergraduate'],
      ['X0021', 'master'],
      ['X0011', 'doctor'],
      ['J0000', 'teacher'],
      ['H0000', 'teacher'],
      ['J0054', 'teacher'],
    ]);

    return {
      studentNumber: rawInfo.zjh,
      username: rawInfo.yhm,
      realName: rawInfo.xm,
      position: userTypeMap.get(rawInfo.yhlb),
      department: rawInfo.dw,
      email: rawInfo.email,
    };
  }

  static async getUserInfo(username, password) {
    const appID = 'WLXT';
    const ticket = await AuthUtil.getTicket(username, password, appID);
    const apiAddress = 'https://id.tsinghua.edu.cn/thuser/authapi/checkticket';
    const checkUrl = `${apiAddress}/${appID}/${ticket}/0_0_0_0`;
    const resp = await rp.get(checkUrl);
    const rawInfo = {};
    for (const item of resp.split(':').map(s => s.split('='))) {
      rawInfo[item[0]] = item[1];
    }

    return AuthUtil._formatUserInfo(rawInfo);
  }
}

module.exports = AuthUtil;
