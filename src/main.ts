import TelegramBot from 'node-telegram-bot-api'
import * as dotenv from "dotenv";
dotenv.config();

const TOKEN:string = process.env.BOT_TOKEN || '';
const bot = new TelegramBot(TOKEN, {polling:true})

import { PrismaClient, setting, users } from "@prisma/client";
const prisma = new PrismaClient();

import { getChatMember, getUser } from './users/users';
import setOrders, { CancelButtonType } from "./orders/orders"
import { home } from './menu/StatickMenu';
import { getOneService, rederCategoryKeyboard, renderPartnerKeyboard, renderServices, StatusTypes } from './menu/DinamickMenu';
import { ButtonType, SteepTypes } from './globalTypes';
import setOrder from './orders/set-order';

bot.onText(/(?=📞 Adminstrator)/, async (msg, match) => {
    let set:setting | null = await prisma.setting.findFirst({where:{id: 1}})
    bot.sendMessage(msg.from!.id, "🔰 Bizga savollaringiz yoki muammolaringiz bo'lsa, iltimos, bizning qo'llab-quvvatlash jamoamiz bilan bog'laning.",{
        reply_markup: {
            inline_keyboard: [
                [{text: "👨‍💻 Adminstrator", url: 'https://t.me/'+set?.admin}]
            ]
        }
    })
})


bot.on('text', async msg => {
    const chat_id:TelegramBot.ChatId = msg.from!.id
    const text:string = msg.text!
    const first_name:string = msg.from!.first_name

    const  { user, new_user } = await getUser(msg,)
    let { is_member } = await getChatMember(bot, msg)
    let set:setting | null = await prisma.setting.findFirst({where:{id: 1}})
    
    let action:any = new Object(user!.action) 
    let steep = new Array(user!.steep || []).flat()
    let last_steep = steep[steep.length-1]
    if(set?.bot_is_on === false && chat_id != Number(set?.admin_id)) return bot.sendMessage(chat_id, "⚙️ Botda texnik ishlar olib borilmoqda")
    if(is_member === false){
        await prisma.users.delete({where:{chat_id}})
        return bot.sendMessage(chat_id, 'Kechirasiz siz kanalimizga azo emassiz', {
            reply_markup: {
                inline_keyboard:[
                    [{text:"➕ Kanalga qo'shilish", url:'https://t.me/'+set?.chanell_username}],
                    [{text:"✅ Tasdiqlash", url: 'https://t.me/'+set?.bot_username +'?start='+text.split(' ')[1]}]
                ]
            }
        })
    }

    if(text.split(' ')[0] == '/start'){
        let partner_id = Number(text.split(' ')[1])
        if(!isNaN(partner_id) && new_user) {
            if(user) {
                const  { user } = await getUser(msg, partner_id)
                if(user === undefined) return
                let partner = user.partners + 1  
                prisma.users.update({where:{chat_id: user?.chat_id}, data:{ partners: partner }})
                bot.sendMessage(partner_id, `👤 <b>Sizning <a href="tg://user?id=${chat_id}">do'stingiz</a> botimizga a'zo bo'ldi</b>\n💰<i> Hisobingizga ${set?.partner_price} RUB qo'shildi</i>`, {parse_mode:'HTML'})
            }
        }
        await prisma.users.update({where: {chat_id}, data: {
            steep: ['home']
        }})
        bot.sendMessage(chat_id, `👋*Assalomualekum ${first_name} botimizga xush kelibsiz*\n\n👉_Bu bot orqali siz ijtimoiy tarmoqlardagi sahiflaringizga obunachi va like kommentarya yig'ishingiz mumkin_`,{
            parse_mode: 'Markdown',
            reply_markup: home
        })
    } else if (text == '🛍 Buyurtma berish'){
        let request_id = 100000 + Math.random() * 900000 | 0
        let category_button = await rederCategoryKeyboard(request_id)
        action.request_id = request_id
        await prisma.users.update({where: {chat_id}, data: {
            steep: ['home', 'setorder'],
            action
        }})
        
        bot.sendMessage(chat_id, "✅ Ijtimoiy tarmoqni tanlang", {
            reply_markup: category_button
        })
        
    } else if (steep[1] == SteepTypes.setOrder){
        return await setOrder(bot,msg, user)
    }
})


bot.on('callback_query', async msg => {
    const chat_id:TelegramBot.ChatId = msg.from!.id
    const callbacData:string = msg.data!
    const first_name:string = msg.from!.first_name
    const  { user, new_user } = await getUser(msg)
    let { is_member } = await getChatMember(bot, msg)
    let action:any = new Object(user!.action)
    
    let data = callbacData.split('=')[1]
    let request_id = callbacData.split('=')[0]

    let steep = new Array(user!.steep).flat()
    if( is_member == false ) return bot.answerCallbackQuery(msg.id, { text:"Siz kanalimizga a'zo bo'lmagansiz azo bo'lish uchun /start tugmasini bosing!", show_alert: true});
    if (request_id != action.request_id) return  bot.answerCallbackQuery(msg.id, { text:"Ushbu tugmadan endi foydalana olmaysiz"});
    if(data === StatusTypes.WORKING ) return bot.answerCallbackQuery(msg.id, { text:"Ushbu xizmatda texnik ishlar olib borilmoqda", show_alert: true});
    
    if(data == ButtonType.back){
        if(action.back == CancelButtonType.select) return 
        steep.pop()
        await prisma.users.update({where: {chat_id}, data:{steep}})
        return cancelClick(user, msg)
    }

    if(steep[1] == SteepTypes.setOrder){
        await setOrders(bot, msg, user, renderPartnerKeyboard, renderServices, getOneService)
    } 
})




const cancelClick = async(user:users | undefined, msg:TelegramBot.CallbackQuery) => {
    try {
        let action:any = new Object(user!.action)
        let chat_id:TelegramBot.ChatId = msg.from.id

        if(action?.back === CancelButtonType.renderCategoryBtn){
            let category_button = await rederCategoryKeyboard(action.request_id)
            action.back = CancelButtonType.select
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText("✅ Ijtimoiy tarmoqni tanlang", {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: category_button
            })
        } else if(action.back === CancelButtonType.renderPartnerBtn){
            let partner_keyboard = await renderPartnerKeyboard(action.partner_id, action.request_id)
            action.back = CancelButtonType.renderCategoryBtn
            action.partner_id = action.partner_id
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText( "✅ Buyurtma turini tanlang", {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: partner_keyboard
            })
        } else if (action.back === CancelButtonType.renderOneService){
            let services_keyboard = await renderServices(action.service_id, action.request_id)
            action.back = CancelButtonType.renderPartnerBtn
            action.service_id = Number(action.service_id)
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText( "✅ Xizmat turini tanlang\nNarxi 1000 ta uchun UZSda ko'rsatilgan ", {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: services_keyboard
            })
        }
    } catch (error) {
        
    }
}