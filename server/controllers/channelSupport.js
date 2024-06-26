const recurringPaypal = require("../functions/recurring-paypal")
const globalModel = require("../models/globalModel")
const dateTime = require("node-datetime")

exports.browse = async (req, res) => {
    let resource_id = req.params.id
    let type = req.params.type
    let itemObject = {}
    let valid = false
    if (resource_id && type) { 
        if(type == "channel"){
            await globalModel.custom(req,"SELECT * from channels where channel_id = ?",[resource_id]).then(result => {
                let item = JSON.parse(JSON.stringify(result));
                if(item && item.length > 0){
                    itemObject = item[0]
                    valid = true
                }
            })
        }
    }
    if(!valid){
        res.redirect(process.env.PUBLIC_URL)
        res.end()
        return
    }

    req.session.orderId = null
    //delete all user pending orders
    await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(result => {
        
    })
    let currentDate = dateTime.create().format("Y-m-d H:M:S")
    //create order
    await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: 1, state: "initial", creation_date: currentDate, source_type: "channel_subscription", source_id: resource_id }, "orders").then(result => {
        if (result) {
            req.session.orderId = result.insertId
        } else {

        }
    })
    if (!req.session.orderId) {
        res.redirect(process.env.PUBLIC_URL)
        res.end()
        return
    }
    const data = {}
    data["amount"] = parseFloat(itemObject.channel_subscription_amount).toFixed(2)
    data['id'] = resource_id
    data["description"] = itemObject.description ? itemObject.description : "Channel Subscription"
    data["headingTitle"] = itemObject.title
    data["returnUrl"] = `${process.env.PUBLIC_URL}/support/successulPayment`
    data["cancelUrl"] = `${process.env.PUBLIC_URL}/support/cancelPayment`
    data.frequency = "month"
    data.interval = 1
    data.sku = "order_"+req.session.orderId
    data.title = itemObject.title
    data.frequency = "month"
    data.interval = 1


    itemObject.type = "month"
    itemObject.duration_type = "year"
    itemObject.duration = 50
    itemObject.interval = 1

    return recurringPaypal.init(req, res, data,itemObject).then(result => {
        if (result.url) {
            req.session.resource_id = resource_id
            req.session.tokenUserPayment = result.token
            res.redirect(302, result.url)
        } else {
            res.redirect("/channel/"+itemObject.custom_url)
        }
    }).catch(err => {
        console.log(err, ' ======= Upgrade Channel subscription RECURRING ERR ============')
        return res.redirect("/channel/"+itemObject.custom_url)
    })
     
}

exports.successul = async (req, res, next) => {

    let id = req.params.id
    let type = req.params.type
    let gateway = req.body.gateway
    let currentDate = dateTime.create().format("Y-m-d H:M:S")
    let commission_amount = 0
    if (!gateway &&  (!req.session.tokenUserPayment || !req.session.resource_id || !req.session.orderId) ) {
        return res.redirect(302, '/')
    } else {

        if(gateway && (gateway == "2" || gateway == "5")){
            req.session.orderId = null
            //delete all user pending orders
            await globalModel.custom(req, "DELETE FROM orders WHERE owner_id = ? AND state = 'initial'", [req.user.user_id]).then(result => {
                
            })
           
            //create order
            await globalModel.create(req, { owner_id: req.user.user_id, gateway_id: 2, state: "initial", creation_date: currentDate, source_type: "channel_subscription", source_id: id }, "orders").then(result => {
                if (result) {
                    req.session.orderId = result.insertId
                } else {

                }
            })
        }

        let resource_id = id ? id : req.session.resource_id
        let orderID = req.session.orderId
        let orders = {}
        let itemObject = {}
        await globalModel.custom(req, "SELECT * FROM orders where order_id =?",[orderID]).then(result => {
            let item = JSON.parse(JSON.stringify(result));
            if(item && item.length > 0){
                orders = item[0] 
            } else {
                resource_id = null
            }
        }).catch(err => {
            resource_id = null
        })
        if(orders.source_type == "channel_subscription"){
            await globalModel.custom(req, "SELECT * FROM channels where channel_id =?",[resource_id]).then(result => {
                let item = JSON.parse(JSON.stringify(result));
                if(item && item.length > 0){
                    itemObject = item[0] 
                } 
            }).catch(err => {
                
            })
        }
        if (!resource_id || Object.keys(itemObject).length == 0) {
            res.send("/")
            res.end()
        }
        let responseGateway = {}
        let isValidResult = false;

        orders.type = "month"
        orders.duration_type = "year"
        orders.duration = 50
        orders.interval = 1

        if(gateway == "2"){
            const { payment_method} = req.body;
            const email = req.user.email
            const stripe = require('stripe')(req.appSettings['payment_stripe_client_secret']);

            await new Promise(async function(resolve, reject){

                //create plan
                let existingPlan = null;
                await new Promise(async function(resolve, reject){
                    stripe.plans.retrieve(
                        "channel_"+orders.source_id+"_"+(String(itemObject.channel_subscription_amount).replace(".",'_'))
                    ,function(err,response){
                        if(err){
                            resolve()
                        }else{
                            existingPlan = response
                            resolve()
                        }
                    });
                })
                if(!existingPlan || !existingPlan.id){
                    
                    existingPlan = await stripe.plans.create({
                        "id":"channel_"+orders.source_id+"_"+(String(itemObject.channel_subscription_amount).replace(".",'_')),
                        "amount_decimal": parseFloat(itemObject.channel_subscription_amount)*100,
                        "interval": orders.type,
                        "interval_count": orders.interval,
                        "currency": req.appSettings.payment_default_currency,
                        "product": {
                            "name" : itemObject.title+req.i18n.t(" Channel Subscription"),
                            "type" : "service"
                        },
                        'metadata':{
                            'gateway_id': 2,
                            'channel_id': id
                        }
                    })
                }
                await stripe.customers.create({
                    payment_method: payment_method,
                    email: email,
                    invoice_settings: {
                        default_payment_method: payment_method,
                    },
                },function(err, customer) {
                    if(err){
                        resolve()
                        res.send({ error: err.raw.message });
                    }else{
                        stripe.subscriptions.create({
                            customer: customer.id,
                            items: [{ plan: existingPlan.id }],
                            expand: ['latest_invoice.payment_intent'],
                            'metadata':{
                                'gateway_id': 2,
                                'order_id': req.session.orderId,
                                "type":"channel_subscription"
                            }
                        },function(err, subscription) {
                            if(err){
                                resolve()
                                res.send({ error: err.raw.message });
                            }else{                            
                                const status = subscription['latest_invoice']['payment_intent']['status'] 
                                const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']
                                if(status == "requires_action"){
                                    req.session.orderConfirmPackageID = package_id
                                    req.session.orderConfirmPackagestate = "completed";
                                    req.session.orderConfirmPackagesid = subscription.id;
                                    res.json({'client_secret': client_secret, 'status': status});
                                }else{
                                    responseGateway.state = "completed";
                                    responseGateway.id = subscription.id;
                                    isValidResult = true;
                                }
                                resolve()
                            }
                        });                            
                    }
                });
            })
        }else if(gateway == "5"){
            // check wallet user amount
            if(parseFloat(itemObject.channel_subscription_amount) > parseFloat(req.user.wallet)){
                res.send({ error: req.i18n.t("You don't have enough balance to purchase, please recharge your wallet.") });
                return;
            }
            // update user wallet price
            const adsTransaction = require("../models/adsTransactions");
            adsTransaction.reduceOwnerWalletAmount(req,{owner_id:req.user.user_id,amount:parseFloat(itemObject.channel_subscription_amount)})

            
            let price = itemObject.channel_subscription_amount
            let commissionType = parseFloat(req.appSettings['channel_support_commission_type'])
            let commissionTypeValue = parseFloat(req.appSettings["channel_support_commission_value"])
            //calculate admin commission
            if(commissionType == 2 && commissionTypeValue > 0){
                commission_amount = parseFloat((price * (commissionTypeValue/100)).toFixed(2));
            }else if(commissionType == 1 && commissionTypeValue > 0){
                commission_amount = commissionTypeValue;
            }
            if(commission_amount > parseFloat(price).toFixed(2)){
                commission_amount = 0
            }

            await globalModel.custom(req,"UPDATE users SET `balance` = balance + ?  WHERE user_id = ?",[(parseFloat(itemObject.channel_subscription_amount) - parseFloat(commission_amount)).toFixed(2),itemObject.owner_id]).then(result => {})


            isValidResult = true;
            responseGateway.id = require('uniqid').process('channel_subscription')
            responseGateway.state = "completed"
        }else{
            await recurringPaypal.execute(req, req.session.tokenUserPayment).then(async executeResult => {
                if (executeResult) {
                    responseGateway.state = "completed";
                    responseGateway.id = executeResult.id;
                    isValidResult = true;
                } else {
                    req.session.channelPaymentStatus = "fail"
                    res.redirect("/channel/"+itemObject.custom_url)
                    res.end()
                }
            }).catch(err => {
                req.session.channelPaymentStatus = "fail"
                res.redirect("/channel/"+itemObject.custom_url)
                res.end()
            }) 
        }
        let currentCurrency = req.currentCurrency
        let changeRate = parseFloat(currentCurrency.currency_value)

        if(isValidResult){
            let changed_expiration_date = await recurringPaypal.getExpirationDate(orders)
            await globalModel.create(req, {gateway_id:gateway ? gateway : 1, type:"channel_subscription",id:req.user.user_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, id: resource_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async result => {
                globalModel.update(req,{gateway_id:gateway ? gateway : 1,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase()},"orders","order_id",req.session.orderId);
                await globalModel
                .custom(
                  req,
                  "SELECT * FROM subscriptions WHERE subscriptions.subscription_id = ?",
                  [result.insertId]
                )
                .then((result) => {
                  if (result) {
                        const res = JSON.parse(JSON.stringify(result));
                    let subscription = res[0];
                    // create transactions
                    let insertData = {
                        state: "completed",
                        order_id: subscription.order_id,
                        package_id: subscription.package_id,
                        commission_amount:commission_amount,
                        type: subscription.type,
                        id: subscription.id,
                        owner_id: subscription.owner_id,
                        subscription_id: subscription.subscription_id,
                        gateway_transaction_id: subscription.gateway_profile_id,
                        gateway_id: subscription.gateway_id,
                        gateway_transaction_id: subscription.gateway_transaction_id,
                        price: parseFloat(itemObject.channel_subscription_amount).toFixed(2),
                        default_currency: req.appSettings["payment_default_currency"],
                        currency:currentCurrency.ID,
                        change_rate:changeRate,
                        creation_date: dateTime.create().format("Y-m-d H:M:S"),
                        modified_date: dateTime.create().format("Y-m-d H:M:S"),
                    };
                    globalModel
                        .custom(
                        req,
                        "INSERT INTO transactions SET ? ON DUPLICATE KEY UPDATE state = ?",
                        [insertData, "completed"]
                        )
                        .then(async (result) => {});
                
                    }
                })
                req.query.type = responseGateway.state.toLowerCase()
                if(!gateway){
                    req.session.channelPaymentStatus = "success"
                    res.redirect("/channel/"+itemObject.custom_url)
                    res.end()
                }else{
                    res.send({status:true})
                }
            })
        }

    }
}
exports.finishPayment = async(req,res) => {
    let resource_id = req.session.orderConfirmPackageID
    let responseGateway = {}
    responseGateway.state = req.session.orderConfirmPackagestate;
    responseGateway.id = req.session.orderConfirmPackagesid
    let currentDate = dateTime.create().format("Y-m-d H:M:S")

    let packageObj = {}
    await globalModel.custom(req, "SELECT * FROM channels where channel_id =?",[resource_id]).then(result => {
        let item = JSON.parse(JSON.stringify(result));
        if(item && item.length > 0){
            packageObj = item[0] 
        } 
    }).catch(err => {
        
    })
    if (!resource_id || Object.keys(packageObj) == 0) {
       res.send({error: "error" })
       return;
    }
    packageObj.type = "month"
    packageObj.duration_type = "year"
    packageObj.duration = 100
    packageObj.interval = 1
    let changed_expiration_date = await recurringPaypal.getExpirationDate(packageObj)
    await globalModel.create(req, {gateway_id:2,type:"channel_subscription",id:req.user.user_id, expiration_date: changed_expiration_date, owner_id: req.user.user_id, package_id: resource_id, status: responseGateway.state.toLowerCase(),creation_date: currentDate, modified_date: currentDate, gateway_profile_id: responseGateway.id,order_id:req.session.orderId }, "subscriptions").then(async result => {
        globalModel.update(req,{gateway_id:2,gateway_transaction_id:responseGateway.id,state:responseGateway.state.toLowerCase()},"orders","order_id",req.session.orderId)
        res.send({status:true});
    })
}
exports.cancel = async (req, res, next) => {
    let resource_id = req.session.resource_id
    let orderID = req.session.orderId
    let itemObject = {}
    await globalModel.custom(req, "SELECT * FROM orders where order_id =?",[orderID]).then(result => {
        let item = JSON.parse(JSON.stringify(result));
        if(item && item.length > 0){
            itemObject = item[0]
        } else {
            resource_id = null
        }
    }).catch(err => {
        resource_id = null
    })
    if (!resource_id) {
        res.send("/")
        res.end()
        return
    }
    if (!req.session.tokenUserPayment) {
        res.redirect("/channel/"+itemObject.custom_url)
        if (req.session.paypalData) {
            req.session.paypalData = null
        }
        res.end()
        return
    }
    req.session.tokenUserPayment = null
    if (req.session.paypalData) {
        req.session.paypalData = null
    }
    req.session.channelPaymentStatus = "cancel"
    res.redirect("/channel/"+itemObject.custom_url)
    res.end()
    
}