import { PrismaClient,users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
import { TelegramBtn } from "src/globalTypes";
import { cancel, home } from "src/menu/StatickMenu";

let prisma = new PrismaClient()
enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner',
    sms = 'sms',
    cobinet = 'cobinet',
    write_summa = 'write_summa',
    card_number = 'card_number',
    payme = 'payme',
    expire = 'expire',
    confirm = 'confirm',
    back = 'back'
}

export default async (bot:TelegramBot, msg: TelegramBot.Message, user:users | undefined, renderCobinetButton: Function, createCheck:Function, chequeVerify:Function, pay:Function, btn:TelegramBtn) => {
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
                disable_web_page_preview: true,
                parse_mode: 'HTML',
                reply_markup: keyboard
            })
        } else if(last_steep === SteepTypes.write_summa){
            if(!Number.isInteger(+text) || (+text >= 1000000 || +text < 5000)) return bot.sendMessage(chat_id, "*❌ Noto'g'ri qiymat. Faqat raqam kiriting e'tiborli bo'ling!\n📈 Max: 1000000 so'm\n📉 Min: 5000 so'm*", {parse_mode:'Markdown'})
            createCheck(text, async (check:{
                status: number, 
                success: boolean, 
                result: {id: number, amount:number}
            }) => {
                if( check.success == true ) {
                    let bonus_summa =  Number(text) + (Number(text) / 100 * 10)
                    action.popolnit_summa = bonus_summa
                    steep.push(SteepTypes.card_number)
                    let pay_info = `💰<b> Bot hisobingiz uchun:</b>\n➕ <code>${bonus_summa}</code> so'm + <i>10% keshbek bilan</i>\n\n💳 <b>Kartadan yechiladigan summa:\n➖ </b><code>${check.result.amount/100}</code> so'm <i>2% kommissiya bilan</i>\n\n`
                    await prisma.users.update({where: {chat_id}, data: {steep,action, verify: check.result.id}})
                    bot.sendMessage(chat_id, pay_info + "💵<b> To'lovni amalga oshirish uchun UZCARD/HUMO karta raqaminigizni kiriting</b>", {
                        parse_mode: 'HTML',
                        reply_markup: {
                            resize_keyboard: true,
                            keyboard: [
                                user?.card_num ? [{text: user!.card_num}] : [],
                                [{text: "❌ Bekor qilish"}]
                            ]
                        }
                    })
                } else { 
                    steep = ['home']
                    await prisma.users.update({where: {chat_id}, data: {steep}})
                    bot.sendMessage(chat_id, '❌ Qandaydir xatolik yuz berdi qayta urinib ko`ring yoki adminga murojaat qiling', {reply_markup: btn.home})
                    return bot.sendMessage(Number(setting?.admin_id || '1228852253'), JSON.stringify(check, null, 4) )
                }
            })
        } else if (last_steep === SteepTypes.card_number) {
            if(['9860','8600','4073'].includes(text.substring(0, 4))) {
                steep.push(SteepTypes.expire)
                await prisma.users.update({where: {chat_id}, data: {card_num: text, steep}})
                bot.sendMessage(chat_id, 'Kartanigizni amal qilish muddatini kiriting', {
                    reply_markup: {
                        resize_keyboard: true,
                        keyboard: [
                            user?.cardDate ? [{text: user.cardDate}] : [],
                            [{text: "❌ Bekor qilish"}]
                        ]
                    }
                })
            } else {
                bot.sendMessage(chat_id, "😕 Bu karta qo'llab quvatlanmaydi")
            }
        } else if (last_steep === SteepTypes.expire) {
            let check_expire = checkExpire(text)
            if(check_expire.result === true){
                steep.push(SteepTypes.sms)
                await prisma.users.update({where: {chat_id}, data: {steep, cardDate: text}})
                let response = await chequeVerify(user?.verify, user?.card_num, text)
                console.log(response);
                if(response.success) {
                    bot.sendMessage(chat_id, response.result.text.uz)
                } else if(!response?.error?.message){
                    steep = ['home']
                    await prisma.users.update({where: {chat_id}, data: {steep}})
                    bot.sendMessage(chat_id, "😕 Karta balansida yetarli mablag' mavjud emas tekshirib qaytadan urinib ko'ring", {reply_markup: btn.home})
                } else if(response?.error?.message) {
                    steep = ['home']
                    await prisma.users.update({where: {chat_id}, data: {steep}})
                    bot.sendMessage(chat_id, response.error.text.uz + ' tekshirib qaytadan urinib ko\'ring')
                } else {
                    bot.sendMessage(chat_id, "⛔️ Kutilmagan xatolik yuzaga keldi keyinroq urinib ko'ring yoki admin bilan bog'laning")
                    bot.sendMessage(Number(setting?.admin_id || '1228852253'), JSON.stringify(response, null, 4))
                }
            } else {
                return bot.sendMessage(chat_id, check_expire.message)
            }
        } else if (last_steep === SteepTypes.sms) {
            let response = await pay(user?.verify, text)
            console.log(response);
            if(response.success) {
                steep = ['home']
                await prisma.users.update({where: {chat_id}, data: {steep}})
                await prisma.kassa.create({data: {cheque_id: Number(user!.verify), chat_id, summa: action.popolnit_summa}})
                return bot.sendMessage(chat_id, "♻️ To'lov amalga oshirilmoqda... Bu bir necha sekund vaqt oladi\n🆔 Amalyot ID: "+user?.verify, {reply_markup: btn.home})
            } else {
                steep = ['home']
                await prisma.users.update({where: {chat_id}, data: {steep}})
                return bot.sendMessage(chat_id, "❌ To'lov amalga oshirilmadi sms kod no'to'g'ri bo'lishi mumkin qayta urinib ko'ring", {reply_markup: btn.home})
            }
        }
    } catch (error:any) {
        return bot.sendMessage('1228852253', error.message)
    }
}

const checkExpire = (expirationDate:string):{result: boolean, message:string} => {
    const currentYear = new Date().getFullYear().toString().substring(2);
    const currentMonth = new Date().getMonth() + 1; // getMonth() 0 dan boshlanadi
    
    const kartYear = parseInt(expirationDate.substring(2));
    const kartMonth = parseInt(expirationDate.substring(0, 2));

    if (Number(kartYear) < Number(currentYear) || (Number(kartYear) === Number(currentYear) && Number(kartMonth) < Number(currentMonth))) {
        console.log("Karta amal qilish muddati o'tgan.");
        return {result: false, message: 'Karta amal qilish muddati o\'tgan.'};
    } else if (Number(kartYear) - Number(currentYear) > 5 || (Number(kartYear) - Number(currentYear) === 5 && Number(kartMonth) > Number(currentMonth))) {
        console.log("Karta amal qilish muddati 5 yildan ko'p kiritilgan.");
        return {result: false, message: 'Karta amal qilish muddati noto\'g\'ri'};
    } else {
        console.log("Karta haqiqiy va amal qilish muddati to'g'ri.");
        return {result: true, message: 'Success'};
    }
}