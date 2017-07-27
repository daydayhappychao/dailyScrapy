var express = require('express')
var router = express.Router()
var request = require('superagent')
var cheerio = require('cheerio')
var fs = require('fs')
let join = require('path').join;
let moment = require('moment')


let logFile = ''
fs.open('log', 'a', function(err, fd) {
    logFile = fd
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
            if (stats.isFile()) result.push(fPath.split('/').length == 1 ? fPath.split('\\')[1] : fPath.split('/')[1]);
        });

    }
    finder(startPath);
    return result;
}

//添加log
function addLog(ip, info) {

    fs.write(logFile, `=================Log Start=================\nDate:${moment().format()}\nUser:${ip}\nInfo:${info}\n\n\n`)

}


//获取ip
function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};



router.get('/data', function(req, res, next) {
    addLog(getClientIp(req), '查看历史报告日志')
    let datas = findSync('data')
    res.render('data', {
        data: datas,
        type: 0
    });
})

router.get('/data/:id', function(req, res, next) {
    addLog(getClientIp(req), `查看历史报告日志详情=>${req.params.id}`)
    let data = fs.readFileSync(`data/${req.params.id}`, 'utf-8')
    res.render('dataDetail', {
        title: `${req.params.id}报告详情`,
        data: JSON.parse(data),
        type:0
    })
})

router.get('/daily',function(req,res,next){
    addLog(getClientIp(req), '查看历史纪要')
    let datas = findSync('daily')
    res.render('data', {
        data: datas,
        type: 1
    });
})

router.get('/daily/:id', function(req, res, next) {
    addLog(getClientIp(req), `查看纪要日志详情=>${req.params.id}`)
    let data = fs.readFileSync(`daily/${req.params.id}`, 'utf-8')
    res.render('dataDetail', {
        title: `${req.params.id}日志详情`,
        data: JSON.parse(data),
        type:1
    })
})


router.get('/user',function(req,res,next){
    addLog(getClientIp(req), `查看用户列表`)
    let data = fs.readFileSync(`user`,'utf-8').split('\n')
    let whiteUser = fs.readFileSync(`whiteUser`,'utf-8').split('\n') 
    res.render('user',{
        data:data,
        whiteUser:whiteUser
    })

})


//如果需要更新日志和报告，则需要先清除老的日志和报告
router.post('/clearDaily',function(req,res,next){
    let time = new Date(Date.now() + (8 * 60 * 60 * 1000));
    // 获取周一
    let now = time.getTime()
    let day = time.getDay()
    let dayTime = 24 * 60 * 60 * 1000
    let monday = new Date(now - (day - 1) * dayTime).toISOString().slice(0, 10)
    let today = req.body.day  
    addLog(getClientIp(req),`删除了${today}的日志和记录`)
    if(today){
        let historyDaily = fs.readFileSync(`daily/${monday}`, `utf-8`)
        let historyData = fs.readFileSync(`data/${monday}`, `utf-8`)

        if (historyDaily)
            historyDaily = JSON.parse(historyDaily)
        else
            historyDaily = {}


        if (historyData)
            historyData = JSON.parse(historyData)
        else
            historyData = {}

        if(historyDaily[`${today}`]){
            delete historyDaily[`${today}`]
        }
        if(historyData[`${today}`]){
            delete historyData[`${today}`]
        }
        //daily写入
        fs.writeFile(`daily/${monday}`, JSON.stringify(historyDaily), function(err) {
            if (err)
                console.log(`写入daily错误:${err}`)
            else{
                fs.writeFile(`data/${monday}`, JSON.stringify(historyData), function(err) {
                    if (err)
                        console.log(`写入daily错误:${err}`)
                    else
                        res.status('200').send('1')
                })
            }
        })

    }else{
        res.status('500').send('瞎搞什么呢傻孩子')
    }
})



router.get('/:mind', function(req, res, next) {
    if (+req.params.mind > 1) {



        let time = new Date(Date.now() + (8 * 60 * 60 * 1000));
        // 获取周一
        let now = time.getTime()
        let day = time.getDay()
        let dayTime = 24 * 60 * 60 * 1000
        let monday = new Date(now - (day - 1) * dayTime).toISOString().slice(0, 10)



        //如果日报信息和日报反馈两个文件不存在，则创建
        if (!(findSync('data').includes(monday))) {
            fs.createWriteStream(`data/${monday}`)
        }
        if (!(findSync('daily').includes(monday))) {
            fs.createWriteStream(`daily/${monday}`)
        }

        //获取用户信息，存在user中
        let userList = []
        fs.readFileSync('user', 'utf-8').split('\n').map(item => {
            item ? userList.push(item.trim()) : ''
        })

        //获取用户白名单信息，存在whiteUser中
        let whiteUserList = []
        fs.readFileSync('whiteUser', 'utf-8').split('\n').map(item => {
            item ? whiteUserList.push(item.trim()) : ''
        })

        //daily和data读取
        let historyDaily = fs.readFileSync(`daily/${monday}`, `utf-8`)
        let historyData = fs.readFileSync(`data/${monday}`, `utf-8`)

        if (historyDaily)
            historyDaily = JSON.parse(historyDaily)
        else
            historyDaily = {}


        if (historyData)
            historyData = JSON.parse(historyData)
        else
            historyData = {}

        if(historyDaily[`${day}`]){
            res.render('dataDetailError',{
                day:day  
            })
        }

        //在判断当日日志不存在后进入日志提交阶段，添加log
        addLog(getClientIp(req), `提交日报编号${req.params.mind}`)









        // 爬取
        var cookie = `seraph.rememberme.cookie=18403%3A17d7c8c51b2a03bb7e9befea6bfdbf39f53bbb71; atlassian.xsrf.token=BOMF-0NE2-V867-2CPI|5d4e611241150784779b47d0e65f59d82d8d0d3a|lin; gh.i=%7B%7D; JSESSIONID=AEBD4783DC3D79F8672CDF54866D8250`


        request.get(`http://jira002.iwencai.com:8080/browse/MIND-${+req.params.mind}?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&showAll=true&_=1500860838464`)
            .set('Accept', '*/*')
        .set('Accept-Encoding', 'gzip, deflate, sdch, br')
        .set('Accept-Language', 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4')
        .set('Connection', 'keep-alive')
        .set('Host', 'jira002.iwencai.com:8080')
        .set('Referer', `http://jira002.iwencai.com:8080/browse/MIND-${+req.params.mind}`)
            .set('User-Agent', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11')
        .set('Cookie', cookie).end((err, res1) => {


            let $ = cheerio.load(res1.res.text, {
                decodeEntities: false
            })

            //日报信息
            let info = [],
                //日报反馈
                badInfo = []



            //数据处理
            $('.issue-data-block').each((i, item) => {
                $(item).find('.aui-avatar-xsmall').remove()
                info.push({
                    user: $($(item).find('.user-avatar')[0]).text().trim(),
                    date: $($(item).find('.livestamp')[0]).text(),
                    data: $(item).find('.action-body').text()
                })
            })



            historyDaily[`${day}`] = info

            //daily写入
            fs.writeFile(`daily/${monday}`, JSON.stringify(historyDaily), function(err) {
                if (err)
                    console.log(`写入daily错误:${err}`)
                else
                    console.log('write down')
            })

            //data计算
            info.map(item => {
                //获取到时间
                let time = item.date.slice(item.date.length - 5, item.date.length)

                let isWhite = false

                whiteUserList.map(v => {
                    if (item.user == v)
                        isWhite = true
                })

                if (!isWhite) {
                    //判断迟到的
                    if ((+time.slice(0, 2) > 9) || ((+time.slice(0, 2) == 9) && (+time.slice(3, 5) >= 30)))
                        badInfo.push(`${item.user} 站会纪要提交于${time},已迟到`)


                    //判断没有写任务号
                    if (item.data.indexOf('MIND') == '-1')
                        badInfo.push(`${item.user} 没有填写任务号`)

                    //判断没有写确认人
                    if (item.data.indexOf('确认') == '-1')
                        badInfo.push(`${item.user} 没有填写确认人`)

                    //判断没有写交付情况
                    if (item.data.indexOf('交付') == '-1')
                        badInfo.push(`${item.user} 没有填写交付情况`)

                    //将已填写的从userList名单中剔除
                    if (userList.includes(item.user))
                        userList.splice(userList.indexOf(item.user), 1)
                }
            })


            //判断userList是否还有人，也添加到badInfo中
            if (userList.length)
                userList.map(item => {
                    badInfo.push(`${item} 站会纪要于${time.toISOString().slice(11, 19)}还未填写`)
                })
                let actions = [] //for promise
                let indexoo = 0
                //昨日mind中的comment检查
                if (historyDaily[`${day-1}`]) { //判断昨天有没有信息记录，如果是周一则没有

                    historyDaily[`${day-1}`].map(item => {

                        let isWhite = false

                        //判断是否白名单，如果白名单则跳过检查
                        whiteUserList.map(v => {
                            if (item.user == v)
                                isWhite = true
                        })
                        if (!isWhite) {
                            //只对填写了mind的做检查，没有写mind的昨天已经扣过分了，今天饶他一命
                            if (item.data.includes('MIND')) {
                                let yesterdayInfo = item.data
                                    let mind = yesterdayInfo.match(/MIND-[0-9]*/i)[0]
                                    //提取昨日mind数据
                                let action = () => {
                                return new Promise(resolve => {
                                    (item => request.get(`http://jira002.iwencai.com:8080/browse/${mind}?page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel&showAll=true&_=1500860838464`)
                                     .set('Accept', '*/*')
                                    .set('Accept-Encoding', 'gzip, deflate, sdch, br')
                                    .set('Accept-Language', 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4')
                                    .set('Connection', 'keep-alive')
                                    .set('Host', 'jira002.iwencai.com:8080')
                                    .set('Referer', `http://jira002.iwencai.com:8080/browse/${mind}`)
                                        .set('User-Agent', 'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11')
                                    .set('X-AUSERNAME', 'wangchao')
                                    .set('X-PJAX', 'true')
                                    .set('X-Requested-With', 'XMLHttpRequest')
                                    .set('Cookie', cookie).end((err, res2) => {
                                        let $ = cheerio.load(res2.res.text, {
                                            decodeEntities: false
                                        })
                                        let lastDate = $('.livestamp').last().attr('datetime')
                                        lastDate = lastDate || '1900-01-01'
                                        console.log(lastDate.slice(5, 10).split('-').join(''))
                                        console.log('===========')
                                        console.log(new Date().toISOString().slice(5, 10).split('-').join(''))
                                        console.log('===========')
                                        console.log(indexoo++)
                                        console.log('===========')

                                        if (lastDate.slice(5, 10).split('-').join('') < (new Date().toISOString().slice(5, 10).split('-').join('') - 1)) {
                                            badInfo.push(`${item.user} 昨日站会纪要任务 ${mind} 未更新`)
                                        }
                                        resolve()

                                    })
                                    )(item)
                                })
                            }
                            actions.push(action)
                            }
                        }
                    })
                }

                Promise.all(actions).then(() => { // 调用Promise的all方法，传入方法数组，结束后执行then方法参数中的方法  
                    // 提交badInfo
                    console.log(12222)
                    historyData[`${day}`] = badInfo
                    fs.writeFile(`data/${monday}`, JSON.stringify(historyData), function(err) {
                        if (err)
                            console.log(`写入data错误:${err}`)
                        else
                            console.log('write down')
                    })

                    res.render('index', {
                        time: time,
                        title: badInfo,
                        type: 0
                    })



                });

        })
    } else {
        res.render('index', {
            title: '',
            type: 1
        });
    }
});


router.get('/', function(req, res, next) {
    addLog(getClientIp(req), '正常登录系统')
    res.render('index', {
        title: '',
        type: 1
    });

})



router.post('/', function(req, res, next) {



})
module.exports = router;
