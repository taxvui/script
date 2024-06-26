const NodeCache = require("node-cache");
const myCache = new NodeCache();
const globalModel = require("../../models/globalModel")
const transactionModel = require("../../models/transactions")
const movieModel = require("../../models/movies")

exports.index = async (req, res) => {

    let statsData = {}
    let type = req.query.type ? req.query.type : "today"
    
    //total earning with commission
    var cachedDataUser = myCache.get("total_earning")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(price) + SUM(admin_commission)) as total FROM transactions WHERE state = 'approved' || state = 'completed'",[]).then(result => {
            if(result){
                myCache.set("total_earning",result[0].total,300)
                statsData.total_earning = result[0].total
            }
        })
    }else{
        statsData.total_earning = cachedDataUser
    }

    //total earning without commission
    var cachedDataUser = myCache.get("total_earning_withoutcommission")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(price)) as total FROM transactions WHERE state = 'approved' || state = 'completed'",[]).then(result => {
            if(result){
                myCache.set("total_earning_withoutcommission",result[0].total,300)
                statsData.total_earning_withoutcommission = result[0].total
            }
        })
    }else{
        statsData.total_earning_withoutcommission = cachedDataUser
    }

    //total commission
    var cachedDataUser = myCache.get("total_commission")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(admin_commission)) as total FROM transactions WHERE state = 'approved' || state = 'completed'",[]).then(result => {
            if(result){
                myCache.set("total_commission",result[0].total,300)
                statsData.total_commission = result[0].total
            }
        })
    }else{
        statsData.total_commission = cachedDataUser
    }
    //total earning today
    var cachedDataUser = myCache.get("total_earning_today")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(price) + SUM(admin_commission)) as total FROM transactions WHERE (state = 'approved' || state = 'completed') AND DATE(creation_date) = CURDATE() AND MONTH(creation_date) = MONTH(NOW()) AND YEAR(creation_date) = YEAR(NOW()) ",[]).then(result => {
            if(result){
                myCache.set("total_earning_today",result[0].total,300)
                statsData.total_earning_today = result[0].total
            }
        })
    }else{
        statsData.total_earning_today = cachedDataUser
    }

    //total earning this month
    var cachedDataUser = myCache.get("total_earning_month")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(price) + SUM(admin_commission)) as total FROM transactions WHERE (state = 'approved' || state = 'completed') AND MONTH(creation_date) = MONTH(NOW()) AND YEAR(creation_date) = YEAR(NOW())",[]).then(result => {
            if(result){
                myCache.set("total_earning_month",result[0].total,300)
                statsData.total_earning_month = result[0].total
            }
        })
    }else{
        statsData.total_earning_month = cachedDataUser
    }

    //total earning this year
    var cachedDataUser = myCache.get("total_earning_year")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(price) + SUM(admin_commission)) as total FROM transactions WHERE (state = 'approved' || state = 'completed') AND YEAR(creation_date) = YEAR(NOW())",[]).then(result => {
            if(result){
                myCache.set("total_earning_year",result[0].total,300)
                statsData.total_earning_year = result[0].total
            }
        })
    }else{
        statsData.total_earning_year = cachedDataUser
    }
    let yAxis = "";
    let xAxis = [];
    let title = "";
    var cachedDataUser = myCache.get("video_earning"+type)
    var cachedDataXaxis = myCache.get("cachedDataXaxis"+type)
    var cachedDataYaxis = myCache.get("cachedDataYaxis"+type)
    if (!cachedDataUser) {
        await transactionModel.getStats(req,{criteria:type,type:"video_purchase"}).then(result => {
            if(result){
                yAxis = result.yaxis
                xAxis = result.xaxis
                myCache.set("video_earning"+type,result,300)
                myCache.set("cachedDataXaxis"+type,xAxis,300)
                myCache.set("cachedDataYaxis"+type,yAxis,300)
                statsData.videos = result
            }
        })
    }else{
        statsData.videos = cachedDataUser
        xAxis = cachedDataXaxis
        yAxis = cachedDataYaxis
    }

    var cachedDataAudio = myCache.get("audio_purchase"+type)
    if (!cachedDataAudio) {
        await transactionModel.getStats(req,{criteria:type,type:"audio_purchase"}).then(result => {
            if(result){
                myCache.set("audio_purchase"+type,result,300)
                statsData.users = result
            }
        })
    }else{
        statsData.audio = cachedDataAudio
    }
    var cachedDataUser = myCache.get("member_subscription"+type)
    if (!cachedDataUser) {
        await transactionModel.getStats(req,{criteria:type,type:"member_subscription"}).then(result => {
            if(result){
                myCache.set("member_subscription"+type,result,300)
                statsData.users = result
            }
        })
    }else{
        statsData.users = cachedDataUser
    }

    var cachedDataChannelSupport = myCache.get("channel_support"+type)
    if (!cachedDataChannelSupport) {
        await transactionModel.getStats(req,{criteria:type,type:"channel_support"}).then(result => {
            if(result){
                myCache.set("channel_support"+type,result,300)
                statsData.channelSupport = result
            }
        })
    }else{
        statsData.channelSupport = cachedDataChannelSupport
    }

    var cachedDataGift = myCache.get("gift"+type)
    if (!cachedDataChannelSupport) {
        await transactionModel.getStats(req,{criteria:type,type:"gift"}).then(result => {
            if(result){
                myCache.set("gift"+type,result,300)
                statsData.giftData = result
            }
        })
    }else{
        statsData.giftData = cachedDataGift
    }

    var cachedDataMovies = myCache.get("movies"+type)
    if (!cachedDataMovies) {
        await movieModel.getStats(req,{criteria:type,type:"movie"}).then(result => {
            if(result){
                myCache.set("movies"+type,result,300)
                statsData.movies = result
            }
        })
    }else{
        statsData.movies = cachedDataMovies
    }
    var cachedDataSeries = myCache.get("series"+type)
    if (!cachedDataSeries) {
        await movieModel.getStats(req,{criteria:type,type:"series"}).then(result => {
            if(result){
                myCache.set("series"+type,result,300)
                statsData.series = result
            }
        })
    }else{
        statsData.series = cachedDataSeries
    }

    var cachedDataTip = myCache.get("video_tip"+type)
    if (!cachedDataTip) {
        await transactionModel.getStats(req,{criteria:type,type:"video_tip"}).then(result => {
            if(result){
                myCache.set("video_tip"+type,result,300)
                statsData.tipData = result
            }
        })
    }else{
        statsData.tipData = cachedDataTip
    }
    
    var cachedDataUser = myCache.get("wallet"+type)
    if (!cachedDataUser) {
        await transactionModel.getStats(req,{criteria:type,type:"wallet"}).then(result => {
            if(result){
                
                myCache.set("wallet"+type,result,300)
                statsData.wallets = result
            }
        })
    }else{
        statsData.wallets = cachedDataUser
    }
    title = type == "today" ? "Today" : (type == "this_week" ? "This Week" : (type == "this_month") ? "This Month" : (type == "this_year") ? "This Year" : "");
    const url = req.originalUrl.replace(process.env.ADMIN_SLUG, '');
    var NumAbbr = require('number-abbreviate')
    var numAbbr = new NumAbbr()
    res.render('admin/earnings/index', {type:type,yAxis:yAxis,xAxis:xAxis,titleChart:title,numAbbr:numAbbr,statsData:statsData,loggedin_id: (req.user ? req.user.user_id : ""), loggedinLevel_id: (req.user ? req.user.level_id : ""),  nav: url,  title: "Earnings" });
}

exports.ads = async (req, res) => {

    let statsData = {}
    let type = req.query.type ? req.query.type : "today"
    
    //total earning with commission
    var cachedDataUser = myCache.get("ads_total_earning")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations ",[]).then(result => {
            if(result){
                myCache.set("ads_total_earning",result[0].total,300)
                statsData.total_earning = result[0].total
            }
        })
    }else{
        statsData.total_earning = cachedDataUser
    }

     //total click
     var cachedDataclick = myCache.get("total_click_earning")
     if (!cachedDataclick) {
         await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations WHERE type = 'click'",[]).then(result => {
             if(result){
                 myCache.set("total_click_earning",result[0].total,300)
                 statsData.total_click_earning = result[0].total
             }
         })
     }else{
         statsData.total_click_earning = cachedDataclick
     }

     //total view
     var cachedDataView = myCache.get("total_view_earning")
     if (!cachedDataView) {
         await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations WHERE type = 'view'",[]).then(result => {
             if(result){
                 myCache.set("total_view_earning",result[0].total,300)
                 statsData.total_view_earning = result[0].total
             }
         })
     }else{
         statsData.total_view_earning = cachedDataView
     }

    
    //total earning today
    var cachedDataUser = myCache.get("total_ads_earning_today")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations WHERE  DATE(creation_date) = CURDATE() AND MONTH(creation_date) = MONTH(NOW()) AND YEAR(creation_date) = YEAR(NOW()) ",[]).then(result => {
            if(result){
                myCache.set("total_ads_earning_today",result[0].total,300)
                statsData.total_earning_today = result[0].total
            }
        })
    }else{
        statsData.total_earning_today = cachedDataUser
    }

    //total earning this month
    var cachedDataUser = myCache.get("total_ads_earning_month")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations WHERE  MONTH(creation_date) = MONTH(NOW()) AND YEAR(creation_date) = YEAR(NOW())",[]).then(result => {
            if(result){
                myCache.set("total_ads_earning_month",result[0].total,300)
                statsData.total_earning_month = result[0].total
            }
        })
    }else{
        statsData.total_earning_month = cachedDataUser
    }

    //total earning this year
    var cachedDataUser = myCache.get("total_ads_earning_year")
    if (!cachedDataUser) {
        await globalModel.custom(req,"SELECT (SUM(amount) ) as total FROM advertisements_transations WHERE  YEAR(creation_date) = YEAR(NOW())",[]).then(result => {
            if(result){
                myCache.set("total_ads_earning_year",result[0].total,300)
                statsData.total_earning_year = result[0].total
            }
        })
    }else{
        statsData.total_earning_year = cachedDataUser
    }
    let yAxis = "";
    let xAxis = [];
    let title = "";
    var cachedDataUser = myCache.get("ads"+type)
    var cachedDataXaxis = myCache.get("cachedDataXaxisads"+type)
    var cachedDataYaxis = myCache.get("cachedDataYaxisads"+type)
    if (!cachedDataUser) {
        await transactionModel.getAdsStats(req,{criteria:type,type:"click"}).then(result => {
            if(result){
                yAxis = result.yaxis
                xAxis = result.xaxis
                myCache.set("ads"+type,result,300)
                myCache.set("cachedDataXaxisads"+type,xAxis,300)
                myCache.set("cachedDataYaxisads"+type,yAxis,300)
                statsData.ads = result
            }
        })
    }else{
        statsData.ads = cachedDataUser
        xAxis = cachedDataXaxis
        yAxis = cachedDataYaxis
    }

    var cachedDataUser = myCache.get("ads_view"+type)
    if (!cachedDataUser) {
        await transactionModel.getAdsStats(req,{criteria:type,type:"view"}).then(result => {
            if(result){
                myCache.set("ads_view"+type,result,300)
                statsData.view = result
            }
        })
    }else{
        statsData.view = cachedDataUser
    }

    title = type == "today" ? "Today" : (type == "this_week" ? "This Week" : (type == "this_month") ? "This Month" : (type == "this_year") ? "This Year" : "");
    const url = req.originalUrl.replace(process.env.ADMIN_SLUG, '');
    var NumAbbr = require('number-abbreviate')
    var numAbbr = new NumAbbr()
    res.render('admin/earnings/ads', {type:type,yAxis:yAxis,xAxis:xAxis,titleChart:title,numAbbr:numAbbr,statsData:statsData,loggedin_id: (req.user ? req.user.user_id : ""), loggedinLevel_id: (req.user ? req.user.level_id : ""),  nav: url,  title: "Advertisement Earning" });
}