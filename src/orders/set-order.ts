import {PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
import { CancelButtonType } from "./orders";
import { profilDataByInsta } from "src/http";
import { home } from "src/menu/StatickMenu";
const prisma = new PrismaClient()
enum SteepTypes {
    setlink = 'setlink',
    setcount = 'setcount'
}

export default async(bot:TelegramBot, msg:TelegramBot.Message | undefined ,user:users | undefined, profilDataByInsta:Function , profileDataByTg:Function, home:any) => {
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

        for (let i = 0; i<feilds.length; i++) {
            if (feilds[i].steep == action.feild_steep) {
                if(!new RegExp(feilds[i].regex).test(text)) return bot.sendMessage(chat_id, feilds[i].error, {disable_web_page_preview:true})
                if( 
                    feilds[i].name == 'count' &&
                    (service.min > Number(text) || Number(action.maxCount.toFixed(0)) < Number(text))
                ) return bot.sendMessage(chat_id, `❗ Noto'g'ri qiymat\n📉 Min - ${service.min}\n📈 Max - ${(action.maxCount).toFixed(0)}`)

                action['feild'][feilds[i].name] =  feilds[i].mask != '0' ? feilds[0].mask + text : text
                feilds[i].mask != '0' ? action['feild']['nomask'] = text : text
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
            let send_text = `⏳ Hisobingizni tekshiring va tasdiqlang <b>linkga e'tiborli bo'ling</b>\n\n`
            action.feild_steep = 0
            action.procces = false
            action.back = CancelButtonType.renderOneService
            action.pending_order = true
            action['feild']['summa'] = +(service.price / 1000).toFixed(2) * action.feild.count
            let partner:any = await prisma.partners.findUnique({where: {id: action.service_id}})
            
            let message = await bot.sendMessage(chat_id, '⏳')
            if(partner?.info?.type === 'subscriber' && partner.info.social == 'telegram'){
                let tgdata = await profileDataByTg(action.feild?.link)
                
                if(!tgdata || tgdata.error) {
                    await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                    return bot.sendMessage(chat_id, "❌ Bu nom bo'yicha kanal topilmadi", {reply_markup:home})
                } 

                action.start_count = tgdata.subscribers

                send_text += `🖋 Kanal nomi: ${tgdata.title.replaceAll(/<|>/g, '')}\n👥 Obunachilar soni ${tgdata.subscribers} ta\n\n`+
                `⛓  SERVICE: <b>${service.name}</b>\n`
                
                for (const feild of feilds) {
                    send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                }
                
                send_text += `\n💵 Summa: <b>${(+(service.price / 1000).toFixed(2) * action.feild.count).toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                bot.deleteMessage(chat_id, message.message_id)
                bot.sendPhoto(chat_id, tgdata?.photo ? tgdata.photo : 'https://t.me/Tg_ItBlog/582',{
                    caption: send_text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard:[
                            [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                            [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                        ]
                    }
                })
            } else if (partner?.info?.type === 'subscriber' && partner.info.social == 'instagram'){
                let instadata = await profilDataByInsta(action.feild?.nomask)
                if(!instadata){
                    await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                    return bot.sendMessage(chat_id, "❌ Bunday akkaunt topilmadi tekshirib qaytadan urinib ko'ring", {reply_markup:home})
                } else if (instadata.is_private){
                    await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                    return bot.sendMessage(chat_id, "⚠️ Sizning akkauntingiz shaxsiy! Biz faqat ommaviy akkauntlarga xizmat ko'rsatamiz akkauntingizni ommaviy qilib qayta urinib ko'ring",  {reply_markup:home})
                }
                action.start_count = instadata.edge_followed_by.count
                send_text += `🖋 Profil: ${instadata.full_name}\n👥 Obunachilar soni ${instadata.edge_followed_by.count} ta\n\n`+
                
                `⛓  SERVICE: <b>${service.name}</b>\n`
                for (const feild of feilds) {
                    send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                }
                
                send_text += `\n💵 Summa: <b>${(+(service.price / 1000).toFixed(2) * action.feild.count).toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                bot.deleteMessage(chat_id, message.message_id)
                bot.sendPhoto(chat_id, instadata.profile_pic_url,{
                    caption: send_text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard:[
                            [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                            [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                        ]
                    }
                })
            } else {
                action.start_count = 0
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
                            [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                        ]
                    }
                })
            }
           
            await prisma.users.update({where: {chat_id}, data: { action }})
           
        }
        
    } catch (error) {
        console.log('set-order error', error)
    }
}
