var express = require('express')
var router = express.Router()
var request = require('superagent')
var cheerio = require('cheerio')
var fs = require('fs')
let join = require('path').join;
let moment = require('moment')

//获取用户信息，存在user中
let userList = []
fs.readFileSync('user', 'utf-8').split('\n').map(item => {
  item ? userList.push(item) : ''
})



/**
 * 
 * @param startPath  起始目录文件夹路径
 * @returns {Array}
 */
function findSync(startPath) {
  let result = [];
  function finder(path) {
    let files = fs.readdirSync(path);
    files.forEach((val, index) => {
      let fPath = join(path, val);
      let stats = fs.statSync(fPath);
      if (stats.isFile()) result.push(fPath.split('/')[1]);
    });

  }
  finder(startPath);
  return result;
}




router.get('/', function (req, res, next) {

  let time = new Date(Date.now() + (8 * 60 * 60 * 1000));
  console.log(time)
  // 获取周一
  let now = time.getTime()
  let day = time.getDay()
  let dayTime = 24 * 60 * 60 * 1000
  let monday = new Date(now - (day - 1) * dayTime).toISOString().slice(0, 10)



  console.log(findSync('data'))
  console.log(monday)
  console.log((findSync('data').includes(monday)))
  //如果日报信息和日报反馈两个文件不存在，则创建
  if (!(findSync('data').includes(monday))) {
    fs.createWriteStream(`data/${monday}`)
  }
  if (!(findSync('daily').includes(monday))) {
    fs.createWriteStream(`daily/${monday}`)
  }



  // 爬取
  var cookie = `bid=A_-T--cRVX0; ll="118172"; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1500741113%2C%22https%3A%2F%2Fwww.google.co.jp%2F%22%5D; __utmt=1; _pk_id.100001.8cb4=f3f7e4746cef1f57.1500741113.1.1500741119.1500741113.; _pk_ses.100001.8cb4=*; __utma=30149280.1599688685.1499442307.1499442307.1500741115.2; __utmb=30149280.2.10.1500741115; __utmc=30149280; __utmz=30149280.1500741115.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __yadk_uid=bCRZ8FtSOVSNYuuX5Dr5AlwgN3EJhUPd; regpop=1; ps=y; dbcl2="164164102:OaB3qbPNVUk"; ck=CMwy`
  request.get(`https://www.douban.com/note/629342278/`)
    .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
    .set('Accept-Encoding', 'gzip, deflate, sdch, br')
    .set('Accept-Language', 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4')
    .set('Connection', 'keep-alive')
    .set('Host', 'www.douban.com')
    .set('Referer', 'http://www.google.com')
    .set('User-Agent', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11')
    .set('Cookie', cookie).end((err, res1) => {
      let $ = cheerio.load(res1.res.text, { decodeEntities: false })

      //日报信息
      let info = [],
        //日报反馈
        badInfo = []




      //数据处理
      $('#comments').find('.report-comment').each((i, item) => {
        info.push({ date: $(item).find('.author').find('span').html(), user: $(item).find('.author').find('a').html() })
      })


      //daily和data读取
      let historyDaily = fs.readFileSync(`daily/${monday}`, `utf-8`)
      let historyData = fs.readFileSync(`data/${monday}`, `utf-8`)

      if (historyDaily)
        historyDaily = JSON.parse(historyDaily)
      else
        historyDaily = {}

      historyDaily[`${day}`] = info

      if (historyData)
        historyData = JSON.parse(historyData)
      else
        historyData = {}




      //daily写入
      fs.writeFile(`daily/${monday}`, JSON.stringify(historyDaily), function (err) {
        if (err)
          console.log(`写入daily错误:${err}`)
        else
          console.log('write down')
      })

      //data计算
      info.map(item => {
        //获取到时间
        let time = item.date.slice(item.date.length - 8, item.date.length)

        //判断迟到的
        if ((+time.slice(0, 2) > 9) || ((+time.slice(0, 2) == 9) && (+time.slice(3, 5) >= 30)))
          badInfo.push(`${item.user} 站会纪要提交于${time},已迟到`)

        //将已填写的从userList名单中剔除
        if (userList.includes(item.user))
          userList.splice(userList.indexOf(item.user), 1)

      })


      //判断userList是否还有人，也添加到badInfo中
      if (userList.length)
        userList.map(item => {
          badInfo.push(`${item} 站会纪要于${time.toISOString().slice(11, 19)}还未填写`)
        })

      // 提交badInfo
      historyData[`${day}`] = badInfo
      fs.writeFile(`data/${monday}`, JSON.stringify(historyData), function (err) {
        if (err)
          console.log(`写入data错误:${err}`)
        else
          console.log('write down')
      })



      res.render('index', { title: badInfo });
    })

});

router.post('/', function (req, res, next) {



})
module.exports = router;
