import TelegramBot from 'node-telegram-bot-api'
import * as dotenv from "dotenv";
dotenv.config();

const TOKEN:string = process.env.BOT_TOKEN || '';
const bot = new TelegramBot(TOKEN, {polling:true})

import { PrismaClient, orders, setting, users } from "@prisma/client";
const prisma = new PrismaClient();

import { getChatMember, getUser } from './users/users';
import setOrders, { CancelButtonType } from "./orders/orders"
import { cancel, home, back } from './menu/StatickMenu';
import { getOneService, rederCategoryKeyboard, renderCobinetButton, renderPartnerKeyboard, renderServices, StatusTypes } from './menu/DinamickMenu';
import { ButtonType, SteepTypes } from './globalTypes';
import cobinet from "./users/user-kobinet"
import setOrder from './orders/set-order';
import { checkStatus, chequeVerify, pay, createCheck, httprequest, profilDataByInsta, profileDataByTg, checkStatusPayment } from './http';
let settingCache: setting | null
let localCache = {}

bot.on('message', async msg => {
    if(msg?.poll){
        let request_id = 100000 + Math.random() * 900000 | 0
        const  { user, new_user } = await getUser(msg)
        let action:any = new Object(user!.action)
        action.request_id = request_id
        if(action.feild_steep === 2){
            let steep = new Array(user!.steep || []).flat()
            let keyboard:any = msg.poll?.options.map(el=>{
                return [{
                    text: el.text,
                    callback_data: request_id + '=' + el.text
                }]
            })
            bot.sendMessage(msg.from!.id, 'Tanlang 👇', {
                reply_markup: {
                    inline_keyboard: keyboard 
                }
            })
            steep.push(SteepTypes.choose_vote)
            await prisma.users.update({where:{chat_id: msg.from!.id},
                data:{
                    action,
                    steep: steep
                }
            })
        }
    }
})

bot.on('text', async msg => {
    const chat_id:TelegramBot.ChatId = msg.from!.id
    const text:string = msg.text!
    if(msg.chat.id.toString() == '-1001593191951') return 
    const first_name:string = msg.from!.first_name
    const  { user, new_user } = await getUser(msg)
    let { is_member } = await getChatMember(bot, msg)
    let set:setting | null = settingCache
    
    let action:any = new Object(user!.action) 
    let steep = new Array(user!.steep || []).flat()
    let last_steep = steep[steep.length-1]

    try {
        if(text === '/botoff' && chat_id == Number(set?.admin_id)){
            await prisma.setting.updateMany({data: {bot_is_on: false}})
            return bot.sendMessage(chat_id, 'Bot o\'chirildi')
        } else if(text === '/boton' && chat_id == Number(set?.admin_id)){
            await prisma.setting.updateMany({data: {bot_is_on: true}})
            return bot.sendMessage(chat_id, 'Bot yondi')
        } else if (text.split('=')[0] === '/addBalance' && chat_id == Number(set?.admin_id)){
            if (!text.split('=')[1]) return
            const  { user, new_user } = await getUser(msg, Number(text.split('=')[1]))
            if (!user) return bot.sendMessage(chat_id, 'User topilmadi')
            await prisma.users.update({where: {chat_id: Number(text.split('=')[1])}, data: {balance: user!.balance + Number(text.split('=')[2])}})
            bot.sendMessage(text.split('=')[1], `<b>Sizning balansingiz admin tomonidan ${text.split("=")[2]} so'mga to'ldirildi</b>`, {parse_mode:'HTML'})
            return bot.sendMessage(chat_id, `<a href="tg://user?id=${text.split('=')[1]}">Foydalanuvchi</a> balansi ${text.split('=')[2]} so'mga to'ldirildi`, {parse_mode:'HTML'})
        } else if (text.split('=')[0] == 'info' && chat_id == Number(set?.admin_id)){
            if (!text.split('=')[1]) return
            const  { user, new_user } = await getUser(undefined, Number(text.split('=')[1]))
            if (!user) return bot.sendMessage(chat_id, 'User topilmadi')
            let txt = `<b>👤 Name:</b> ${user.full_name}\n<b>✍️ Username:</b> ${user?.username ? user?.username : 'yoq'}\n<b>🆔 Id:</b> ${user.id}\n<b>💵 Balance:</b> ${user.balance} so'm\n<b>👥 Group parner:</b> ${user.group_partners}\n<b>👥 Partner:</b> ${user.partners}\n<b>🚫 Is block:</b> ${user.is_block}`
            return bot.sendMessage(chat_id, txt, {parse_mode: 'HTML'})
        } else if (text.split('=')[0] == 'block' && chat_id == Number(set?.admin_id)){
            if (!text.split('=')[1]) return
            const  { user, new_user } = await getUser(undefined, Number(text.split('=')[1]))
            if (!user) return bot.sendMessage(chat_id, 'User topilmadi')
            let updated = await prisma.users.update({where: {chat_id: Number(text.split('=')[1])}, data: {is_block: !user?.is_block}})
            return bot.sendMessage(chat_id, `<a href="tg://user?id=${text.split('=')[1]}">Foydalanuvchi</a> ${updated.is_block ? 'blocklandi': 'blockdan chiqarildi'}`, {parse_mode:'HTML'})
        }
    } catch (error:any) {
        return bot.sendMessage(chat_id, 'Error: '+ error.message)
    }
    
    if(user?.is_block) return 
    if(set?.bot_is_on === false && chat_id != Number(set?.admin_id)) return bot.sendMessage(chat_id, "⚙️ Botda texnik ishlar olib borilmoqda")
    if(is_member === false){
        if(new_user){
            action.is_join_chanell = false
            await prisma.users.update({where:{chat_id}, data: {action}})
        }
        return bot.sendMessage(chat_id, 'Kechirasiz siz kanalimizga azo emassiz', {
            reply_markup: {
                inline_keyboard:[
                    [{text:"➕ Kanalga qo'shilish", url:'https://t.me/'+set?.chanell_username}],
                    [{text:"✅ Tasdiqlash", url: 'https://t.me/'+set?.bot_username +'?start='+text.split(' ')[1]}]
                ]
            }
        })
    }

    // if(new_user === true) {
    //     // await prisma.users.delete({where:{chat_id}})
    //     return bot.sendMessage(chat_id, '🤖 Bot emasligizni tasdiqlang', {
    //         reply_markup: {
    //             inline_keyboard:[
    //                 [{text:"✅ Tasdiqlash", url: 'https://t.me/'+set?.bot_username +'?start='+text.split(' ')[1]}]
    //             ]
    //         }
    //     })
    // }
    if(text == '❌ Bekor qilish') {
        steep = ['home']
        await prisma.users.update({where: {chat_id}, data: {steep}})
        return bot.sendMessage(chat_id, "🏠 Bosh sahifa", {reply_markup: home})
    } 

    if(text.split(' ')[0] === ButtonType.start || text === ButtonType.gethome){
        let partner_id = Number(text.split(' ')[1])
        if(!isNaN(partner_id) && !action.is_join_chanell) {
            if(user) {
                const  { user } = await getUser(undefined, partner_id)
                if(user === undefined) return
                let partner = user.partners + 1  
                let balance = user.balance + (set?.partner_price || 0)
                await prisma.users.update({where:{chat_id: user?.chat_id}, data:{ partners: partner, balance: balance }})
                bot.sendMessage(partner_id, `👤 <b>Sizning <a href="tg://user?id=${chat_id}">do'stingiz</a> bo'timizga a'zo bo'ldi</b>\n💰<i> Hisobingizga ${set?.partner_price} SO'M qo'shildi</i>`, {parse_mode:'HTML'})
            }
        }
        await prisma.users.update({where: {chat_id}, data: {
            steep: ['home'],
            action: {is_join_chanell: true}
        }})
        return bot.sendMessage(chat_id, `👋*Assalomualekum ${first_name} botimizga xush kelibsiz*\n\n👉_Bu bo't orqali siz ijtimoiy tarmoqlardagi sahiflaringizga obunachi va like kommentarya yig'ishingiz mumkin_`,{
            parse_mode: 'Markdown',
            reply_markup: home
        })
    } else if (text == '🛍 Buyurtma berish'){
        let request_id = 100000 + Math.random() * 900000 | 0
        let category_button = await rederCategoryKeyboard(request_id)
        action.request_id = request_id
        action.feild_steep = 0
        action.back = CancelButtonType.renderCategoryBtn
        await prisma.users.update({where: {chat_id}, data: {
            steep: ['home', 'setorder'],
            action
        }})
        
        bot.sendMessage(chat_id, "✅ Ijtimoiy tarmoqni tanlang", {
            reply_markup: category_button
        })
        
    } else if (text == '📞 Adminstrator'){
        return bot.sendMessage(msg.from!.id, "🔰 Bizga savollaringiz yoki muammolaringiz bo'lsa, iltimos, bizning qo'llab-quvvatlash jamoamiz bilan bog'laning.",{
            reply_markup: {
                inline_keyboard: [
                    [{text: "👨‍💻 Adminstrator", url: 'https://t.me/'+set?.admin}]
                ]
            }
        })
    } else if (text == '💡 Buyurtmani xolati'){
        action.request_id = 100000 + Math.random() * 900000 | 0
        if( !steep.includes(SteepTypes.checkOrder)  ||  text == '💡 Buyurtmani xolati') await prisma.users.update({where: {chat_id}, data: {
            steep: ['home', SteepTypes.checkOrder],
            action
        }}), steep = ['home', SteepTypes.checkOrder]; user!.steep = ['home', SteepTypes.cobinet]; last_steep = steep[steep.length-1]
        bot.sendMessage(chat_id, "*🆔 Buyurtma id raqamini yuboring*", {
            parse_mode:'Markdown',
            reply_markup: cancel
        })
    } else if (text == '🗃 Kabinet' || steep[1] === SteepTypes.cobinet){
        action.request_id = 100000 + Math.random() * 900000 | 0
        if( !steep.includes(SteepTypes.cobinet)  ||  text == '🗃 Kabinet') await prisma.users.update({where: {chat_id}, data: {
            steep: ['home', SteepTypes.cobinet],
            action
        }}), user!.steep = ['home', SteepTypes.cobinet]; steep = ['home', SteepTypes.cobinet]; last_steep = steep[steep.length-1]
        return await cobinet(bot, msg, user, renderCobinetButton, createCheck, chequeVerify, pay, {home, cancel, back})
    } else if (steep[1] == SteepTypes.setOrder && action.feild_steep != 0){
        return await setOrder(bot, msg, user, profilDataByInsta, profileDataByTg, home)
    } else if (last_steep === SteepTypes.checkOrder){
       try {
            if(!Number.isInteger(Number(text))) return bot.sendMessage(chat_id, "*❌ Buyurtma idsi no'tog'ri*", {parse_mode:'Markdown'}) 
            let order = await prisma.orders.findFirst({where:{order_id: Number(text)}})

            if (!order) return bot.sendMessage(chat_id, "*‼️ Bu id orqali buyurtma topilmadi*", {parse_mode:'Markdown'})
            let order_user = (await getUser(undefined, Number(order!.chat_id))).user?.username
            let txt = 
            `<b>${order.status == "Completed" ? '✅' : order.status == 'Canceled' ? '❌' : '⏳'}`+
            ` Buyurtma holati: </b>${order.status}\n\n`+
            `<b>🚀 Servis: </b>${order.service_name}\n`+  
            `<b>🆔 Buyurtma Id:</b> <code>${order.order_id}</code>\n`+  
            `<b>📍 Servis Id: </b>${order.service_id}\n`+  
            `<b>💎 Miqdor: ${order.count}</b>\n\n`+  
            `<b>👁 Boshlang'ich miqdor:</b> ${order.start_count}\n`+  
            `<b>🏷 Qolgan miqdor:</b> ${order.ready_count}\n`+  
            `<b>🔗 Link:</b> ${order.link}\n`+  
            `<b>💵 Summa:</b> ${order.price} so'm\n`+  
            `<b>🙆‍♂️ Buyurtmachi</b> <a href="tg://user?id=${order.chat_id}">${order_user ? order_user : order.chat_id}</a>\n\n`+
            `<b>⏰ Buyurtma sanasi:</b> ${order.created_at.toLocaleString()}\n`

            bot.sendMessage(chat_id, txt, {
                disable_web_page_preview: true,
                parse_mode: 'HTML',
                reply_markup: home
            })
       } catch (error) {
            return bot.sendMessage(chat_id, "*❌ Buyurtma idsi no'tog'ri*", {parse_mode:'Markdown'})
       }
    } else if (last_steep === SteepTypes.write_summa) {

    }
})

let queryDb:any = {}
bot.on('callback_query', async msg => {
    
    const chat_id:TelegramBot.ChatId = msg.from!.id
    const callbacData:string = msg.data!
    const  { user, new_user } = await getUser(msg)
    if(user?.is_block) return
    let { is_member } = await getChatMember(bot, msg)
    let set:setting | null = await prisma.setting.findFirst({where:{id: 1}})
    let action:any = new Object(user!.action)
    let data = callbacData.split('=')[1]
    let request_id = callbacData.split('=')[0]
    let steep = new Array(user!.steep).flat()
    
    if(set?.bot_is_on === false && chat_id != Number(set?.admin_id)) return bot.answerCallbackQuery(msg.id, {text: "⚙️ Botda texnik ishlar olib borilmoqda",show_alert:true})
    if( is_member == false ) return bot.answerCallbackQuery(msg.id, { text:"Siz kanalimizga a'zo bo'lmagansiz azo bo'lish uchun /start tugmasini bosing!", show_alert: true});
    if(data === StatusTypes.WORKING ) return bot.answerCallbackQuery(msg.id, { text:"Ushbu xizmatda texnik ishlar olib borilmoqda", show_alert: true});
    if(queryDb[chat_id] && Number(queryDb[chat_id].request_time+500) > Number(new Date().getTime())) return bot.answerCallbackQuery(msg.id, { text:"⚙️ Botdan sekinroq foydalaning"});
    
    queryDb[chat_id] = {
        request_time: new Date().getTime()
    }
    
    if (request_id != action.request_id) return  bot.answerCallbackQuery(msg.id, { text:"❌ Ushbu tugmadan endi foydalana olmaysiz"});
    if(steep[steep.length-1] === SteepTypes.choose_vote){
        let request_id = 100000 + Math.random() * 900000 | 0
        action.feild.vote = data
        action.feild_steep += 1
        action.request_id = request_id
        steep.pop()
        await prisma.users.update({where: {chat_id}, data: {action, steep}})        
        bot.editMessageText('✅Tanlandi: \n'+data, {chat_id, message_id:msg.message?.message_id})
        bot.sendMessage(chat_id, 'Miqdorni kiriting')

    }
    if(data === ButtonType.back){
        if(action.back == CancelButtonType.select) return 
        steep.pop()
        await prisma.users.update({where: {chat_id}, data:{steep}})
        return cancelClick(user, msg)
    } else if (data === ButtonType.setOrder){
        return await setOrder(bot, undefined, user, profilDataByInsta, profileDataByTg, home)
    } else if (data === ButtonType.cancelOrder){
        return bot.answerCallbackQuery(msg.id, { text:"Bu xizmatga buyurtma qilish uchun xisobingizda mablag` yetmaydi", show_alert: true});
    } else if (data === ButtonType.confirm){
        return await httprequest(bot, msg, user)
    } else if (data === ButtonType.paynet){
        steep.push(SteepTypes.write_summa)
        action.request_id = 100000 + Math.random() * 900000 | 0
        await prisma.users.update({where: {chat_id}, data: {
            steep: steep,
            action: action
        }})
        return bot.sendMessage(chat_id, "*💰 Miqdorni kiriting so'mda*", {parse_mode:'Markdown'})
    } else if (data === ButtonType.add_partner){
        return bot.sendMessage(chat_id, `👉 @pro_smm_group gruxiga odam qo'shin va qo'shgan odamingiz uchun ${set?.group_partner_sum} so'm pul ishlang`)
    } else if(steep[1] === SteepTypes.setOrder || ButtonType.backOrder === data){
        if(ButtonType.backOrder === data){
            let request_id = 100000 + Math.random() * 900000 | 0
            let category_button = await rederCategoryKeyboard(request_id)
            action.request_id = request_id
            action.feild_steep = 0
            action.back = CancelButtonType.renderCategoryBtn
            await prisma.users.update({where: {chat_id}, data: {
                steep: ['home', 'setorder'],
                action
            }})
            bot.deleteMessage(chat_id, msg.message!.message_id)
            return bot.sendMessage(chat_id, "❌ Buyurtma bekor qilindi ijtimoiy tarmoq turini tanlang", {
                reply_markup: category_button
            })
        }
        await setOrders(bot, msg, user, renderPartnerKeyboard, renderServices, getOneService)
    } 
})

const cancelClick = async(user:users | undefined, msg:TelegramBot.CallbackQuery) => {
    try {
        let action:any = new Object(user!.action)
        let chat_id:TelegramBot.ChatId = msg.from.id

        if(action?.back === CancelButtonType.renderCategoryBtn){
            let category_button = await rederCategoryKeyboard(action.request_id)
            if (!category_button.inline_keyboard.length) return
            action.back = CancelButtonType.select
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText("✅ Ijtimoiy tarmoqni tanlang "+new Date().toLocaleTimeString(), {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: category_button
            })
        } else if(action.back === CancelButtonType.renderPartnerBtn){
            let partner_keyboard = await renderPartnerKeyboard(action.partner_id, action.request_id)
            if (!partner_keyboard.inline_keyboard.length) return
            action.back = CancelButtonType.renderCategoryBtn
            action.partner_id = action.partner_id
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText( "✅ Buyurtma turini tanlang "+new Date().toLocaleTimeString(), {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: partner_keyboard
            })
        } else if (action.back === CancelButtonType.renderOneService){
            let services_keyboard = await renderServices(action.service_id, action.request_id)
            if (!services_keyboard.inline_keyboard.length) return
            action.back = CancelButtonType.renderPartnerBtn
            action.service_id = Number(action.service_id)
            await prisma.users.update({where:{chat_id},
                data:{
                    action: action
                }
            })
            bot.editMessageText( "✅ Xizmat turini tanlang\nNarxi 1000 ta uchun UZSda ko'rsatilgan "+new Date().toLocaleTimeString(), {
                chat_id,
                message_id: msg.message?.message_id,
                reply_markup: services_keyboard
            })
        }
    } catch (error) {
        
    }
}

let checkOrders = async() => {
    let orders = await prisma.orders.findMany({ where: { AND: { status: {in:['Canceled', 'Partial', 'Completed']}, return: false} } })
    for (const order of orders) {
        let {user} = await getUser(undefined, Number(order.chat_id))
        let return_price = order.price! - (order.price! / order.count!) * (order.count! > order.ready_count! ? order.count! - order.ready_count!: 0)

        await prisma.orders.update({ where: { id: order.id }, data: { return: true } })
        await prisma.users.update({ where: { chat_id: Number(order.chat_id) }, data: { balance: user!.balance + return_price } })
        let completedText = `<b>✅ Sizning <code>${order.order_id}</code> raqamli buyurtmangiz bajarildi\n\n🏷 Buyurtma miqdori: ${order.count} ta\n✔️ Bajarilgan miqdor: ${order.count! - order.ready_count!}</b>\n`
        let canceledText = `<b>⚠️ Sizning <code>${order.order_id}</code> raqamli buyurtmangiz ${order.status == "Partial" ? 'qisman bajarildi' : 'bekor qilindi'}\n🏷 Buyurtma miqdori: ${order.count} ta\n✔️ Bajarilgan miqdor: ${order.count! - order.ready_count!}\n🗞 Hisobingizga ${return_price} so'm qaytarildi</b>`
        let text = order.status == 'Completed' ? completedText : canceledText
        return bot.sendMessage(Number(order.chat_id), text, {parse_mode: 'HTML'})
    }
}
let gt_username = '@pro_smm_group'
let grCount:number
const cacheModule = async ()=> {
    let set:setting | null = await prisma.setting.findFirst({where:{id: 1}})
    let groupMemberCount = await bot.getChatMemberCount(gt_username)
    settingCache = set
    grCount =  groupMemberCount
}
cacheModule()

let newChatMembersCache:any = {}
bot.on('new_chat_members', async msg=> {         
    let from_chat = msg.from!.id
    if(msg.chat.id.toString() != '-1001593191951') return
    await getUser(msg)
    let new_chat_members = msg.new_chat_members!
    for (let i = 0; i < new_chat_members!.length; i++) {
        let groupMemberCount = await bot.getChatMemberCount(gt_username)
        console.log(`groupMemberCount1 ${groupMemberCount}, grGlobalCount1 ${grCount}`);
        if(from_chat == new_chat_members[i]!.id)  return 
        if (newChatMembersCache[from_chat]) {
            newChatMembersCache[from_chat].summa = newChatMembersCache[from_chat].summa + (groupMemberCount > grCount ?  Number(settingCache?.group_partner_sum || 10) : 0)
            newChatMembersCache[from_chat].count = newChatMembersCache[from_chat].count + (groupMemberCount > grCount ? 1 : 0)
            if(groupMemberCount > grCount) grCount = grCount + 1
        } else newChatMembersCache[from_chat] = {summa:Number(settingCache?.group_partner_sum || 10), count: 1}
        console.log('new_Chat_Members_Cache', newChatMembersCache);
        console.log(`groupMemberCount2 ${groupMemberCount}, grGlobalCount2 ${grCount}`);
    }
})

setInterval(async()=> {
    let chat_members = Object.keys(newChatMembersCache)
    if(!chat_members.length) return     
    for (let i = 0; i < chat_members.length; i++) {
        const {user, new_user} = await getUser(undefined, Number(chat_members[i]))
        let summa = newChatMembersCache[chat_members[i]].summa
        let count = newChatMembersCache[chat_members[i]].count
        let update_user = await prisma.users.update({
            where: { chat_id: Number(chat_members[i])},
            data: {balance: user!.balance + summa, group_partners: user!.group_partners + count}
        })
        console.log('update_user',update_user);
        console.log('newChatMembersCache', newChatMembersCache);
        delete newChatMembersCache[chat_members[i]]
    }
    console.log('Delete newChatMembersCache', newChatMembersCache);
}, 5000);

setInterval(async()=> {
    await checkOrders()
    await cacheModule()
    await checkStatus()
    await checkStatusPayment(bot)
},10000)

