import { PrismaClient,users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";

let prisma = new PrismaClient()
enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner',
    cobinet = 'cobinet',
    write_summa = 'write_summa',
    payme = 'payme',
    back = 'back'
}

export default async (bot:TelegramBot, msg: TelegramBot.Message, user:users | undefined, renderCobinetButton: Function, createCheck:Function) => {
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
            let keyboard = await renderCobinetButton(user)
            bot.sendMessage(chat_id, text,{
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        } else if(last_steep === SteepTypes.write_summa){
            action.popolnit_summa = text
            steep = ['home']
            await prisma.users.update({where: {chat_id}, data: {steep,action}})
            createCheck(text, (check: {
                success: boolean,
                result: {
                  paymentid: string,
                  chequeid: string
                }
              }) => {
                console.log(check);
                bot.sendMessage(chat_id, "To'lovni amalga oshirish uchun \n<b>💳 To'lov qilish</b> tugmasini bosing to'lov amalga oshirgach \n<b>✅ Tasdiqlash</b> tugmasini bosing", {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{text: "💳 To'lov qilish", url: process.env.PAYME_CHECK+ check.result.chequeid}],
                            [{text: "✅ Tasdiqlash", callback_data: '=check-'+ check.result.chequeid, }]
                        ]
                    }
                })
                
            })
        }
    } catch (error) {
        
    }
}