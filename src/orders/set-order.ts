import {PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
import { CancelButtonType } from "./orders";
const prisma = new PrismaClient()
enum SteepTypes {
    setlink = 'setlink',
    setcount = 'setcount'
}

export default async(bot:TelegramBot, msg:TelegramBot.Message | undefined ,user:users | undefined) => {
    try {

        let steep = new Array(user!.steep || []).flat()
        let action:any = new Object(user!.action)
        let text:string = msg?.text || ''
        let chat_id:TelegramBot.ChatId = Number(user?.chat_id)
        let service = await prisma.services.findUnique({where:{id: action.oneservice_id}})

        if(!service) return bot.sendMessage(chat_id, "😕 Qandaydir xatolik yuz berdi /start tugmasini bosing")
        let feilds:Array<{steep: number, regex: string, title:string, name:string} | any> = new Array(service?.feild || []).flat()

        if(!action?.feild_steep || action?.procces !== true) {
            action.feild_steep = 1
            action.procces = true
            action.feild = {}
            action.request_id = 100000 + Math.random() * 900000 | 0 
            await prisma.users.update({
                where: { chat_id: Number(chat_id) },
                data: {action}
            })
            return bot.sendMessage(chat_id, feilds[0].title, {disable_web_page_preview:true})
        } 
        console.log(action);
        
        for (let i = 0; i<feilds.length; i++) {
            if (feilds[i].steep == action.feild_steep) {
                if(!new RegExp(feilds[i].regex).test(text)) return bot.sendMessage(chat_id, feilds[i].error, {disable_web_page_preview:true})
                if( 
                    feilds[i].name == 'count' &&
                    (service.min > Number(text) || Number(action.maxCount.toFixed(0)) < Number(text))
                ) return bot.sendMessage(chat_id, `❗ Noto'g'ri qiymat\n📉 Min - ${service.min}\n📈 Max - ${(action.maxCount).toFixed(0)}`)

                action['feild'][feilds[i].name] =  feilds[i].mask != '0' ? feilds[0].mask + text : text
                if (i+1 < feilds.length) {
                    bot.sendMessage(chat_id, feilds[i+1].title, {disable_web_page_preview:true})
                }
                
            } 
        }

        if(action.procces === true){ 
            action.feild_steep += 1
            await prisma.users.update({
                where: { chat_id: Number(chat_id) },
                data: {action}
            })
        }

        if(feilds.length < action.feild_steep) {
            let send_text = `⏳ Buyurtmani tekshiring va tasdiqlang <b>linkga e'tiborli bo'ling</b>\n\n⛓  SERVICE: <b>${service.name}</b>\n`
            action.feild_steep = 0
            action.procces = false
            action.back = CancelButtonType.renderOneService
            action.pending_order = true
            action['feild']['summa'] = +(service.price / 1000).toFixed(2) * action.feild.count
            await prisma.users.update({where: {chat_id}, data: { action }})
            
            for (const feild of feilds) {
                send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
            }
            
            send_text += `\n💵 Summa: <b>${(+(service.price / 1000).toFixed(2) * action.feild.count).toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
            `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
            
            bot.sendMessage(chat_id, send_text,{
                disable_web_page_preview: true,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard:[
                        [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                        [{text: '❌ Bekor qilish', callback_data: action.request_id + '=back'}]
                    ]
                }
            })
        }
        
    } catch (error) {
        console.log('set-order error', error)
    }
}
