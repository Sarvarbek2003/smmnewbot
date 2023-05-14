import { PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
const prisma = new PrismaClient();

enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner',
    getservices = 'getservices',
    getservice = 'getservice',
    setLink = 'setlink'
}

export default async(
        bot:TelegramBot, msg:TelegramBot.CallbackQuery, user:users | undefined, 
        renderPartnerKeyboard:Function, renderServices:Function, getOneService:Function
    ) => {
    const chat_id:TelegramBot.ChatId = msg.from!.id
    const data:string = msg.data!.split('=')[1]
    const first_name:string = msg.from!.first_name
    let action:any = new Object(user!.action)

    let steep = new Array(user!.steep).flat()
    let last_steep = steep[steep.length-1]

    if (last_steep === SteepTypes.setOrder) {
        let partner_keyboard = await renderPartnerKeyboard(data, action.request_id)
        steep.push(SteepTypes.getpartner)
        action.back = CancelButtonType.renderPartnerBtn
        action.partner_id = Number(data)
        await prisma.users.update({where:{chat_id},
            data:{
                action: action,
                steep: steep
            }
        })
        bot.editMessageText( "✅ Buyurtma turini tanlang", {
            chat_id,
            message_id: msg.message?.message_id,
            reply_markup: partner_keyboard
        })
    } else if (last_steep === SteepTypes.getpartner){
        let services_keyboard = await renderServices(data, action.request_id)
        steep.push(SteepTypes.getservices)
        action.back = CancelButtonType.renderPartnerBtn
        action.service_id = Number(data)
        await prisma.users.update({where:{chat_id},
            data:{
                action: action,
                steep: steep
            }
        })
        bot.editMessageText( "✅ Xizmat turini tanlang\nNarxi 1000 ta uchun UZSda ko'rsatilgan ", {
            chat_id,
            message_id: msg.message?.message_id,
            reply_markup: services_keyboard
        })
    } else if (last_steep === SteepTypes.getservices){
        let getOneServiceData = await getOneService(Number(data), action.request_id, user)
        if(!getOneServiceData.isActive) return bot.answerCallbackQuery(msg.id, { text:"Ushbu xizmatda texnik ishlar olib borilmoqda", show_alert: true});
        steep.push(SteepTypes.setOrder)
        action.back = CancelButtonType.renderOneService
        action.oneservice_id = Number(data)

        await prisma.users.update({where:{chat_id},
            data:{
                action: action,
                steep: steep
            }
        })
        
        bot.editMessageText(getOneServiceData.text, {
            parse_mode: 'Markdown',
            chat_id,
            message_id:msg.message?.message_id,
            reply_markup: getOneServiceData.keyboard
        })
    } 
}

export enum CancelButtonType {
    renderCategoryBtn = 'renderCategoryButton',
    renderPartnerBtn = 'renderPartnerButton',
    renderOneService = 'renderOneService',
    select = 'select'
}