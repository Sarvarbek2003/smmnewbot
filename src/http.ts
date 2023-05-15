import { PrismaClient, setting, users } from "@prisma/client";
import { translate } from "free-translate";
import TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'
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
        console.log(action);
        let service = await prisma.services.findUnique({where:{id: action.oneservice_id}})
        let feilds:Array<{steep: number, regex: string, title:string, name:string} | any> = new Array(service?.feild || []).flat()
        
        if (action.pending_order === true && service?.type === ServiceType.default){
            let summa = +(service.price / 1000).toFixed(2) * action.feild.count
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
                            status: 'In Progress',
                            count: Number(action.feild.count),
                            ready_count: 0,
                            price: summa,
                            start_count: 0,
                            created_at: new Date()
                        }
                    }).then((el)=> console.log('newOrder', el))

                    let send_text = `✅ Buyurtma qabul qilindi\n\n🚀 Service: ${service?.name}\n🆔 Buyurtma ID: <code>${response.data.order}</code>\n\n`
                    for (const feild of feilds) {
                        send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                    }
                    
                    send_text += `\n💵 Summa: <b>${summa} so'm</b>\n`+
                    `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                    bot.sendMessage(chat_id, send_text, {parse_mode:'HTML', disable_web_page_preview: true})
                    let userBalance:number = user!.balance - summa
                    prisma.users.update({where: {chat_id:Number(chat_id)}, data:{
                        balance: userBalance
                    }}).then((el)=> console.log('userBalance', el))
                } else if(response.data.error){
                    if(response.data.error.replaceAll(' ','').replaceAll('.', '') === 'YouhaveactiveorderwiththislinkPleasewaituntilorderbeingcompleted'){
                        bot.sendMessage(chat_id, '⚠️ Sizda ushbu havolada faol buyurtma mavjud. Iltimos, buyurtma tugaguncha kuting.')
                    } else {
                        bot.sendMessage(chat_id, response.data.error)
                    }
                }
              })
              .catch((error) => {
                return bot.sendMessage(chat_id, '⚠️ ' +error.message )
              });
              
        }
        
    } catch (error) {
        console.log('http error ', error);
        
    }
}



export { httprequest }