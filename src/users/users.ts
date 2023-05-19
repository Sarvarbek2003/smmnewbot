import { PrismaClient, setting, users } from "@prisma/client";
import TelegramBot from 'node-telegram-bot-api'
import { SelectUserResponse } from "src/types/userTypes";
const prisma = new PrismaClient();

const getUser = async(msg?:TelegramBot.Message | TelegramBot.CallbackQuery | undefined, chatId?:number):Promise<SelectUserResponse> => {
    if(chatId) {
        return await getUserByPartnerId(chatId);
    }
    return await getUserByMessage(msg);
} 

const getUserByPartnerId = async (chatId?: number) => {
    let is_user:users | null  = await prisma.users.findUnique({where: {chat_id: chatId}})
    if (!is_user) {
        return {user:undefined , new_user:false}
    }
    return {user: is_user, new_user: false}
}

const getUserByMessage = async (msg: TelegramBot.Message | TelegramBot.CallbackQuery | undefined) => {
    if(!msg) return {user:undefined , new_user:false}
    let chat_id:number = msg.from!.id
    let full_name:string = msg.from!.first_name 
    let is_user:users | null  = await prisma.users.findUnique({where: {chat_id}})
    

    if (!is_user) {
        let new_user = await prisma.users.create({
            data:{
                chat_id,
                full_name,
                steep: ['home'],
                username: msg!.from?.username, 
                created_ad: new Date()
            }
        })
        // console.log("getUser new_user", {user: new_user, new_user: true});
        return {user: new_user, new_user: true}
    } 

    // console.log("getUser is_user", {user: is_user, new_user: false});
    return {
        user: is_user, 
        new_user: false
    }
}


const getChatMember = async (bot:TelegramBot, msg:TelegramBot.Message | TelegramBot.CallbackQuery): Promise<{is_member:boolean}> => {
    return {is_member:true}
    try {
        let set:setting | null = await prisma.setting.findFirst({where: {id: 1}})
        console.log("setting", set);
        if(!set) return {is_member:false}

        let user = await bot.getChatMember(set!.chanell_id!, msg.from!.id)

        if (['member', 'administrator', 'creator'].includes(user.status)){
            return {is_member: true}
        }

        return {is_member:false}
    } catch (error) {
        return {is_member:false}
    }

}

export { getUser, getChatMember }