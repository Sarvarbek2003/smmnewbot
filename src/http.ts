import { PrismaClient, setting, users } from "@prisma/client";
import TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'
import http  from 'https'
import { createWriteStream, existsSync, mkdirSync, readFileSync, stat, writeFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
import * as dotenv from "dotenv";
import { ServiceType } from "./globalTypes";
dotenv.config();

const TOKEN:string = process.env.BOT_TOKEN || '';


const httprequest = async (bot:TelegramBot, msg: TelegramBot.CallbackQuery, user:users | undefined) => {
    try {
        let BASE_URL = process.env.SERVICE_URL || ''       
        let KEY = process.env.SERVICE_KEY || ''       
        let action:any = new Object(user!.action)
        let getOneServiceData:string = msg?.data || ''
        let chat_id:TelegramBot.ChatId = Number(user?.chat_id)
        console.log(action);
        
        let service = await prisma.services.findUnique({where:{id: action.oneservice_id}})
        console.log(service);
        
        let feilds:Array<{steep: number, regex: string, title:string, name:string} | any> = new Array(service?.feild || []).flat()
        console.log(feilds);
        
        if (action.pending_order === true && service?.type){
            let summa = +(service.price / 1000) * action.feild.count
            let data
            if(service.type === ServiceType.default){
                data = JSON.stringify({
                    "key": KEY,
                    "action": "add",
                    "service": service.service_id,
                    "link": action.feild.link,
                    "quantity": action.feild.count
                });
            }else if(service.type === ServiceType.poll){
                data = JSON.stringify({
                    "key": KEY,
                    "action": "add",
                    "service": service.service_id,
                    "link": action.feild.link,
                    "quantity": action.feild.count,
                    "answer_number": action.feild.vote
                });
            }
              
            let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: BASE_URL,
            headers: { 
                'Content-Type': 'application/json'
            },
            data : data
            };
            console.log(config);
            
            axios.request(config)
                .then((response) => {
                bot.deleteMessage(chat_id, msg.message!.message_id)
                console.log(response.data);
            
                if(response.data?.order) {
                    prisma.orders.create({
                        data: {
                            service_name: service?.name,
                            service_id: service!.service_id!,
                            order_id: response.data.order,
                            chat_id: Number(chat_id),
                            link: action.feild.link,
                            status: 'Pending',
                            count: Number(action.feild.count),
                            ready_count: 0,
                            price: summa,
                            start_count: action.start_count,
                            return:false,
                            created_at: new Date()
                        }
                    }).then((el)=> console.log('newOrder', el))

                    let gr_send = `♻️ Yangi buyurtma keldi\n\n🚀 Service: ${service?.name}\n🆔 Buyurtma ID: <code>${response.data.order}</code>\n\n`
                    let send_text = `✅ Buyurtma qabul qilindi\n\n🚀 Service: ${service?.name}\n🆔 Buyurtma ID: <code>${response.data.order}</code>\n\n`
                    for (const feild of feilds) {
                        send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                        gr_send += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                    }
                    
                    send_text += `\n💵 Summa: <b>${summa.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                    `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                    gr_send += `\n💵 Summa: <b>${summa.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                    `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                    bot.sendMessage(chat_id, send_text, {parse_mode:'HTML', disable_web_page_preview: true})
                    bot.sendMessage('-1001182204049', gr_send, {parse_mode:'HTML', disable_web_page_preview: true})
                    let userBalance:number = user!.balance - summa
                    prisma.users.update({where: {chat_id:Number(chat_id)}, data:{
                        balance: userBalance,
                        steep: ['home']
                    }}).then((el)=> console.log('userBalance', el))
                } else if(response.data.error){
                    if(response.data.error === 'neworder.error.link_duplicate'){
                        bot.sendMessage(chat_id, '⚠️ Sizda ushbu havolada faol buyurtma mavjud. Iltimos, buyurtma tugaguncha kuting.')
                    } else {
                        bot.sendMessage(chat_id, `⚠️ Diqqat ushbu xatolikni adminga tashlang\n\n${response.data.error}`)
                    }
                }
              })
              .catch((error) => {
                return bot.sendMessage(chat_id, '⚠️ Diqqat ushbu xatolikni adminga tashlang\n\n' +error.message )
              });
              
        } 
        
    } catch (error) {
        console.log('http error ', error);
        
    }
}

const createCheck = async(summa:string, callback:Function) => {
    let options = {
        method: 'POST',
        url: process.env.PAYME_URL,
        headers: {
            'Content-Type': 'application/json',
            'token': '78886ec3-24fa-4da2-8c78-62509c1e25a2'
        },
        data: {
            "method": "cheque.create2Card",
            "params": {
                "card_number": "9860350102464210",
                "amount": Number(summa) * 100
            }
        }
        
    };
    axios.request(options)
    .then((res) => {
        callback(res.data)
    })
    .catch((err) => console.log('err',err))
   
}

const chequeVerify = async(cheque_id:string, card:string, expire:string) => {
    try {
        expire = expire.substring(2) + expire.substring(0,2)
        let options = {
            method: 'POST',
            url: process.env.PAYME_URL,
            headers: {
                'Content-Type': 'application/json',
                'token': '78886ec3-24fa-4da2-8c78-62509c1e25a2'
            },
            data: {
                "method": "cheque.verify",
                "params": {
                    cheque_id,
                    card, 
                    expire
                }
            }
        };
        console.log(options);
        
        let res = await axios.request(options)
        return res.data
    } catch (err:any) {
        return {
            success: false,
            result: {
              status: 'error',
              cheque: cheque_id,
              error: err.message
            }
        }   
    }
}

const pay = async (cheque_id:number, smsCode: string): Promise<{
    status: number; success: boolean; result: {
        "otp": boolean;
        "status": string;
    };
}> => {
    try {
        let options = {
            method: 'POST',
            url: process.env.PAYME_URL,
            headers: {
                'Content-Type': 'application/json',
                'token': '78886ec3-24fa-4da2-8c78-62509c1e25a2'
            },
            data: {
                "method": "cheque.pay",
                "params": {
                    "cheque_id": cheque_id,
                    "sms_code": smsCode
                }
            }
        };
        let res = await axios.request(options)
        return res.data
    } catch (err:any) {
        return {
            success: true,
            status: 400,
            result: {
              status: 'error',
              otp: false,
            }
        }   
    }
}

const checkStatus = async() => {
    let orders = await prisma.orders.findMany({where:{status: {notIn:['Completed', 'Canceled']}}})
    for (const order of orders) {
        let options = {
            method: 'POST',
            url: process.env.SERVICE_URL,
            headers: {
                'Content-Type': 'application/json',
                'token': '01d84f11-b067-4958-b0b2-ecd39b05d13f'
            },
            data: {
                "key": process.env.SERVICE_KEY,
                "action": "status",
                "order": order.order_id
            }
            
        };
        try {
            let response:any = await axios.request(options)
            response = response.data
            await prisma.orders.update({where: {id: order.id}, data: {
                start_count: Number(response.start_count),
                status:response.status,
                ready_count: Number(response.remains)
            }})
        } catch (error) {
            console.log('checkStatus', error);
        }
        
    }
}

const checkStatusPayment = async(bot: TelegramBot) => {
    let orders = await prisma.kassa.findMany({where:{status: {in:['process']}}})
    for (const order of orders) {
        let options = {
            method: 'POST',
            url: process.env.PAYME_URL,
            headers: {
                'Content-Type': 'application/json',
                'token': '78886ec3-24fa-4da2-8c78-62509c1e25a2'
            },
            data: {
                "method": "cheque.get",
                "params": {
                    "cheque_id": order.cheque_id
                }
            }
            
        };
        try {
            let response:any = await axios.request(options)
            response = response.data
            if(response.success) {
                let status = response.result.status
                await prisma.kassa.update({where: {id: order.id}, data: {
                    status:status,
                }})
                let user = await prisma.users.findUnique({where: {chat_id: order.chat_id}})
                if ( status == 'success' ) {
                    let balance = Number(user?.balance  || 0) + order.summa
                    await prisma.users.update({where: {chat_id: order.chat_id}, data: {balance}})
                    let txt = `💸 <b>To'lov\n➕ ${order.summa.toLocaleString('ru-RU', { minimumIntegerDigits: 2})} UZS\n💳 ***${user?.card_num?.substring(12)}\n🕓 ${new Date().toLocaleString()}\n💵 ${balance.toLocaleString('ru-RU', { minimumIntegerDigits: 2})}\n\n</b> #xabarnoma`
                    bot.sendMessage('1228852253', txt + '\nID: <a href="tg://user?id='+order.chat_id+'">'+order.chat_id+'</a>',  {parse_mode: 'HTML'})  
                    bot.sendMessage(Number(order.chat_id), txt, {parse_mode: 'HTML'})   
                } else if ( status == 'cancel' ) {
                    let txt = `❌<b> To'lov bekor qilindi\n➖ ${order.summa.toLocaleString('ru-RU', { minimumIntegerDigits: 2})} UZS\n💳 ***${user?.card_num?.substring(12)}\n🕓 ${new Date().toLocaleString()}\n💵 ${user?.balance.toLocaleString('ru-RU', { minimumIntegerDigits: 2})}\n\n</b> #xabarnoma`
                    bot.sendMessage(Number(order.chat_id), txt,  {parse_mode: 'HTML'})   
                    bot.sendMessage('1228852253', txt + '\nID: <a href="tg://user?id='+order.chat_id+'">'+order.chat_id+'</a>',  {parse_mode: 'HTML'})   
                }
            }
        } catch (error) {
            console.log('checkStatus', error);
        }
        
    }
}

const profilDataByInsta = async (username:string, bot:TelegramBot) => {
    try {
        let response = await axios.get(`https://www.instagram.com/${username}`)
        let followers = response.data.split(`"description":"`)[1].split(`"userInteractionCount":`)[2].split(`}]}`)[0].replaceAll('"','')
        let profilePicture = response.data.split(`"profile_pic_url\":"`)[1].split(",")[0].replaceAll('"', '')
        
        return { 
            followers,
            profilePicture
        }
        
        // if(!response.data.users.length) return false
        // let user = response.data.users.find((user:any) => {
        //     if(user.user.username === username) {
        //         return user
        //     }
        // })
        // return user
    } catch (error) {
        console.log(error);
        
        return false
    }
}

const profileDataByTg = async (username:string) => {
    let localbase = JSON.parse(readFileSync(join(process.cwd(), 'src', 'localbase.json'), 'utf8'))
    localbase.request_count = localbase.request_count + 1
    username = username.startsWith('https://t.me/') ? username.split('https://t.me/')[1] : username.split('@')[1]
    console.log(username);
    const options = {
        method: 'GET',
        url: `https://api.telegram.org/bot${TOKEN}/getchatmemberscount?chat_id=@`+username,
    };
    const options2 = {
        method: 'GET',
        url: `https://api.telegram.org/bot${TOKEN}/getChat?chat_id=@`+username,
    };

    try {
        let data = {
            members: 0,
            chanell_name: 'Chanell',
            chat_photo: 'https://t.me/Tg_ItBlog/582'
        }
        let response = await axios.request(options);
        let response2 = await axios.request(options2);
        console.log('response', response.data);
        console.log('response2', response2.data);
        
        if(response.data.ok == true) {
            data.members = response.data.result
        }
        else { return false }
        if(response2.data.ok === true) {
            data.chanell_name = response2.data.result.title
            if(response2.data.result?.photo){
                let response3 = await axios.get(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=`+response2.data.result?.photo.big_file_id)
                console.log(response3.data);
                if(response3.data.ok == true){
                    data.chat_photo = `https://api.telegram.org/file/bot${TOKEN}/`+response3.data.result.file_path
                }
            } else data.chat_photo = 'https://offical.myxvest.ru/photo.jpg'
        } else {return false}
        if (!existsSync('files/'+username)) {
            mkdirSync('files/'+username,  { recursive: true })
        }
        const file = await createWriteStream(join(process.cwd(), 'files/'+username, 'image.jpg'));
        let finished = await new Promise((resolve, reject) => {
            http.get(data.chat_photo, function(response) {
                response.pipe(file)
                response.on('end', () => {
                    resolve(true)
                })
            });
        })

        if(finished){
            data.chat_photo = 'files/'+username+'/image.jpg'
            console.log(data);
            return data
        }

    } catch (error) {
        return false
    }
}


export { httprequest, createCheck, chequeVerify, pay, checkStatus, profilDataByInsta, profileDataByTg, checkStatusPayment } 