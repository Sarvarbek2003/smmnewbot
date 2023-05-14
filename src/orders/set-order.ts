import {PrismaClient, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
const prisma = new PrismaClient()
enum SteepTypes {
    setlink = 'setlink',
    setcount = 'setcount'
}

export default async(bot:TelegramBot, msg:TelegramBot.Message,user:users | undefined) => {
    try {
        let steep = new Array(user!.steep || []).flat()
        let last_steep = steep[steep.length-1]
        let chat_id:TelegramBot.ChatId = msg.from!.id
    
        if(last_steep === SteepTypes.setlink){
            steep.push(SteepTypes.setcount)
            bot.sendMessage(chat_id, "*Miqdorni kiriting! Faqat sonda*", {
                parse_mode: 'Markdown'
            })
            prisma.users.update({where: {chat_id}, data: {steep}})
        } else if (last_steep === SteepTypes.setcount){
            // bot.sendMessage(chat_id, )
        }
    } catch (error) {
        
    }
}