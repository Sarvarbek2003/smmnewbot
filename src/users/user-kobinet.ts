import { PrismaClient,users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
let prisma = new PrismaClient()
enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner',
    cobinet = 'cobinet',
    payme = 'payme',
    back = 'back'
}

export default async (bot:TelegramBot, msg:TelegramBot.Message, user:users | undefined, renderCobinetButton: Function) => {
    try {
        const chat_id:TelegramBot.ChatId = msg.from!.id
        const text:string = msg.text!
        const first_name:string = msg.from!.first_name
        let action:any = new Object(user!.action) 
        let steep = new Array(user!.steep || []).flat()
        let last_steep = steep[steep.length-1]
        console.log(msg);
        let setting = await prisma.setting.findFirst({where: {id: 1}})
        if(last_steep === SteepTypes.cobinet){
            let text = 
            `<b>┌👥 Kabinet</b>\n`+
            `<b>├ Siz botga taklif qilgan azolar soni :</b> <code>${user?.partners}</code> ta\n`+
            `<b>├ Id raqamingiz : </b><code>${chat_id}</code>\n`+
            `<b>├ Gruxga qo'shgan odamingiz soni</b> : <code><b>${user?.group_partners}</b></code>\n`+
            `<b>└ Balans:</b> ${user?.balance.toLocaleString('ru-RU',{ minimumIntegerDigits: 2})} SO'M\n\n`+
            `<i>Siz bo'timizga do'stlaringizni taklif qilib ham ${setting?.partner_price} SO'M pul ishlashingiz mumkin</i>\n`+
            `👉 https://t.me/${setting?.bot_username}?start=${chat_id}\n\n`+
            `<i>Yoki gruhimizga odam qo'shgan xolda har bir qo'shgan odamingiz uchun ${setting?.group_partner_sum} so'm olishingiz mumkin</i>\n\n`+
            `💰 Hisobingizni UZCARD/HUMO kartalari orqali to'ldirishingiz mumkin`
            let keyboard = await renderCobinetButton()
            bot.sendMessage(chat_id, text,{
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        }   
    } catch (error) {
        
    }
}