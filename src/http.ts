import { PrismaClient, setting, users } from "@prisma/client";
import TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();

enum ServiceType { 
    default = 'default'
}

const httprequest = async (bot:TelegramBot, msg: TelegramBot.CallbackQuery, user:users | undefined) => {
    try {
        let BASE_URL = process.env.SERVICE_URL || ''       
        let KEY = process.env.SERVICE_KEY || ''       
        let action:any = new Object(user!.action)
        let getOneServiceData:string = msg?.data || ''
        let chat_id:TelegramBot.ChatId = Number(user?.chat_id)

        let service = await prisma.services.findUnique({where:{id: action.oneservice_id}})
        let feilds:Array<{steep: number, regex: string, title:string, name:string} | any> = new Array(service?.feild || []).flat()
        
        if (action.pending_order === true && service?.type === ServiceType.default){
            let summa = +(service.price / 1000) * action.feild.count
            let data = JSON.stringify({
                "key": KEY,
                "action": "add",
                "service": service.service_id,
                "link": action.feild.link,
                "quantity": action.feild.count
              });
              
              let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: BASE_URL,
                headers: { 
                  'Content-Type': 'application/json'
                },
                data : data
              };
              
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
                    bot.sendMessage('-1001593191951', gr_send, {parse_mode:'HTML', disable_web_page_preview: true})
                    let userBalance:number = user!.balance - summa
                    prisma.users.update({where: {chat_id:Number(chat_id)}, data:{
                        balance: userBalance,
                        steep: ['home']
                    }}).then((el)=> console.log('userBalance', el))
                } else if(response.data.error){
                    if(response.data.error.replaceAll(' ','').replaceAll('.', '') === 'YouhaveactiveorderwiththislinkPleasewaituntilorderbeingcompleted'){
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
        url: process.env.PAYME_URL + '/p2p/create',
        headers: {
            'Content-Type': 'application/json'
        },
        data: {
            "number": "9860350102464210",
            "amount": summa
        }
        
    };
    axios.request(options)
    .then((res) => {
        callback(res.data)
    })
    .catch((err) => console.log('err',err))
   
}

const checkout = async(paymentid:string) => {
    try {
        let options = {
            method: 'GET',
            url: process.env.PAYME_URL + `/checkout/${paymentid}`,
        };
        let res = await axios.request(options)
        return res.data
    } catch (err:any) {
        return {
            success: true,
            result: {
              status: 'error',
              cheque: 'https://payme.uz/checkout/'+paymentid,
              error: err.message
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
                'Content-Type': 'application/json'
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

const profilDataByInsta = async (username:string, bot:TelegramBot) => {
    try {
        let response = await axios.get(`http://mahina-info.ru/index.php?username=${username}`)
        return response.data.result
    } catch (error) {
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
        url: 'https://telegram92.p.rapidapi.com/api/info/channel',
        params: {channel: username},
        headers: {
          'X-RapidAPI-Key': localbase['request_token'+(localbase.request_count > 1000 ? 2 : 1)],
          'X-RapidAPI-Host': 'telegram92.p.rapidapi.com'
        }
    };

    try {
        let response = await axios.request(options);
        writeFileSync(join(process.cwd(), 'src', 'localbase.json'), JSON.stringify(localbase, null, 4))
        
        return response.data
    } catch (error) {
        return false
    }
}


export { httprequest, createCheck, checkout, checkStatus, profilDataByInsta, profileDataByTg}