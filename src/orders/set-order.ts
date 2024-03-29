import {PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
import { CancelButtonType } from "./orders";
import FormData from 'form-data';
import * as dotenv from "dotenv";
dotenv.config();

const TOKEN:string = process.env.BOT_TOKEN || '';
import axios from "axios";
import { createReadStream, mkdirSync, readFileSync, rmSync, rmdirSync } from "fs";
import { join } from "path";
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
        console.log('user', user);
        
        for (let i = 0; i<feilds.length; i++) {
            if (feilds[i].steep == action.feild_steep) {
                if(!new RegExp(feilds[i].regex).test(text)) return bot.sendMessage(chat_id, feilds[i].error, {disable_web_page_preview:true})
                if( 
                    feilds[i].name == 'count' &&
                    (service.min > Number(text) || Number(action.maxCount.toFixed(0)) < Number(text))
                ) return bot.sendMessage(chat_id, `❗ Noto'g'ri qiymat\n📉 Minimal - ${service.min}\n📈 Maximal - ${(action.maxCount).toFixed(0)}`)

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
            let sum = Number(service.price / 1000) * action.feild.count
            action['feild']['summa'] = sum
            let partner:any = await prisma.partners.findUnique({where: {id: action.service_id}})
            
            let message = await bot.sendMessage(chat_id, '⏳')
            if(partner?.info?.type === 'subscriber' && partner.info.social == 'telegram'){
                let tgdata = await profileDataByTg(action.feild?.link)
                console.log('tgdata',tgdata);
                if(!tgdata) {
                    bot.deleteMessage(chat_id, message.message_id)
                    await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                    return bot.sendMessage(chat_id, "❌ Bu nom bo'yicha kanal topilmadi", {reply_markup:home})
                } 

                action.start_count = tgdata.members

                send_text += `🖋 Kanal nomi: ${tgdata.chanell_name.replaceAll(/<|>/g, '')}\n👥 Obunachilar soni ${tgdata.members} ta\n\n`+
                `⛓  SERVICE: <b>${service.name}</b>\n`
                
                for (const feild of feilds) {
                    send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                }
                
                send_text += `\n💵 Summa: <b>${sum.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                bot.deleteMessage(chat_id, message.message_id)
                const stream = createReadStream(tgdata?.chat_photo);
                bot.sendPhoto(chat_id, stream,{
                    caption: send_text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard:[
                            [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                            [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                        ]
                    }
                })
                setTimeout(() => {
                    let dir = tgdata.chat_photo.split('/')[0] +'/'+ tgdata.chat_photo.split('/')[1]
                    rmSync(dir, { recursive: true, force: true })
                }, 3000);
                
            } else if (partner?.info?.type === 'subscriber' && partner.info.social == 'instagram'){
                console.log("nomask",action.feild?.nomask);
                
                // let instadata = await profilDataByInsta(action.feild?.nomask)
                // console.log(instadata);
                

                // if(!instadata){
                //     bot.deleteMessage(chat_id, message.message_id)
                //     await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                //     return bot.sendMessage(chat_id, "❌ Bunday akkaunt topilmadi tekshirib qaytadan urinib ko'ring", {reply_markup:home})
                // } else if (instadata.followers == '0'){
                //     bot.deleteMessage(chat_id, message.message_id)
                //     await prisma.users.update({where: {chat_id}, data: { steep: ['home'] }})
                //     return bot.sendMessage(chat_id, "⚠️ Sizning akkauntingiz shaxsiy! Biz faqat ommaviy akkauntlarga xizmat ko'rsatamiz akkauntingizni ommaviy qilib qayta urinib ko'ring",  {reply_markup:home})
                // }
                // action.start_count = instadata.followers
                // send_text += `👥 Obunachilar soni ${instadata.followers} ta\n\n`+
                
                send_text += `⛓  SERVICE: <b>${service.name}</b>\n`
                for (const feild of feilds) {
                    send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n` 
                }
                
                send_text += `\n💵 Summa: <b>${sum.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                bot.deleteMessage(chat_id, message.message_id)
                bot.sendMessage(chat_id, send_text, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard:[
                            [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                            [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                        ]
                    }
                })
                // return bot.sendPhoto(chat_id, instadata.profilePicture.replaceAll('\\', ''),{
                //     caption: send_text,
                //     parse_mode: 'HTML',
                //     reply_markup: {
                //         inline_keyboard:[
                //             [{text: '✅ Tasdiqlash', callback_data: action.request_id + '=confirm'}],
                //             [{text: '❌ Bekor qilish', callback_data: action.request_id + '=backOrder'}]
                //         ]
                //     }
                // })
            } else {
                send_text += `⛓ SERVICE: <b>${service.name}</b>\n`
                action.start_count = 0
                for (const feild of feilds) {
                    send_text += `⛓ ${feild.name.toUpperCase()}: <b>${action.feild[feild.name]}</b>\n`
                }
                
                send_text += `\n💵 Summa: <b>${sum.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} so'm</b>\n`+
                `⏰ Buyurtma vaqti: <b>${new Date().toLocaleString()}</b>`
                bot.deleteMessage(chat_id, message.message_id)
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
