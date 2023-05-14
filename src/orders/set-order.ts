import {PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
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

        console.log('action1', action);
        if(!action?.feild_steep || action?.procces !== true) {
            action.feild_steep = 1
            action.procces = true
            action.feild = {}
            await prisma.users.update({
                where: { chat_id: Number(chat_id) },
                data: {action}
            })
            return bot.sendMessage(chat_id, feilds[0].title)
        } 
        console.log(feilds);
        
        for (let i = 0; i<feilds.length; i++) {
            if (feilds[i].steep == action.feild_steep) {
                console.log(new RegExp(feilds[i].regex), text , new RegExp(feilds[i].regex).test(text));
                if(!new RegExp(feilds[i].regex).test(text)) return bot.sendMessage(chat_id, feilds[i].error)
                if( 
                    feilds[i].name == 'count' &&
                    (service.min > Number(text) || service.max < Number(text))
                ) return bot.sendMessage(chat_id, `❗ Noto'g'ri qiymat\n📉 Min - ${service.min}\n📈 Max - ${service.max}`)
                action['feild'][feilds[i].name] = text
                if (i+1 < feilds.length) {
                    bot.sendMessage(chat_id, feilds[i+1].title)
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
            action.feild_steep = 0
            action.procces = false
            bot.sendMessage(chat_id, 'ishladi')
        }
        console.log('action2', action);
        
       
        
    } catch (error) {
        console.log('set-order error', error)
    }
}
