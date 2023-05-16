import { PrismaClient, services, setting, users } from "@prisma/client";
import TelegramBot from "node-telegram-bot-api";
const prisma = new PrismaClient();

enum StatusTypes {
    ACTIVE = 'active',
    WORKING = 'working',
    NOACTIVE = 'noactive'
}

const rederCategoryKeyboard = async(request_id:number) => {
    let categories = await prisma.categories.findMany({where: {NOT:{status: StatusTypes.NOACTIVE}}})
    let count = 0
    let array = []
    let arr: { text: string; callback_data: string ; }[] = []
    categories.forEach(el => {
        let collbackData = `${request_id}=${el.status === StatusTypes.WORKING ? StatusTypes.WORKING :el.id}`
        if (count < 2){
            arr.push({text: el.name, callback_data:collbackData})
            count++
        } else  {
            array.push(arr)
            arr = []; count = 0
            arr.push({text: el.name, callback_data: collbackData})
        }
    })
    array.push(arr)
    return {
        inline_keyboard: array
    }
}

const renderPartnerKeyboard = async (category_id:string, request_id:number) => {
    try {
        let partners = await prisma.partners.findMany({
            where: { 
                AND: { 
                    NOT: { status: StatusTypes.NOACTIVE },
                    category_id: Number(category_id)
                }  
            },
            orderBy: {
                id: 'asc'
            }
        })
    
        let array = []
        partners.forEach(el => {
            let collbackData = `${request_id}=${el.status === StatusTypes.WORKING ? StatusTypes.WORKING : el.id}`
            array.push([{text: el.name, callback_data:collbackData}])
        })
    
        array.push([{text: "🔙 Ortga", callback_data: request_id+'=back'}])
        return {
            inline_keyboard: array
        }
    } catch (error) {
        return {
            inline_keyboard: [[{text: "🔙 Ortga", callback_data: request_id+'=back'}]]
        }
    }
}

const renderServices = async (partner_id: string, request_id:number) => {
    try {
        let services = await prisma.services.findMany({where: {partner_id:Number(partner_id)}, orderBy: {price: 'asc'}})
        let array = []
        services.forEach(el => {
            let callbacData = `${request_id}=${el.status === StatusTypes.WORKING ? StatusTypes.WORKING : el.id}`
            array.push([{text: `${el.name}->[${el.price}so'm]`, callback_data: callbacData}])
        })

        array.push([{text: "🔙 Ortga", callback_data: request_id+'=back'}])
        return {
            inline_keyboard: array
        }
    } catch (error) {
        return {    
            inline_keyboard: []
        }
    }
}

const getOneService = async (service_id:number, request_id:number, user:users | undefined) => {
    try {
        let getOneService:services | null = await prisma.services.findUnique({where: {id:service_id}})

        let info:any = new Object(getOneService?.info)
        let min = getOneService?.min || 1000
        
        let maxCount = Number(user?.balance || 0) / (Number(getOneService!.price || 0) / 1000) 
        let action:any = new Object(user!.action)
        action.maxCount = maxCount
        await prisma.users.update({where: {chat_id: Number(user?.chat_id)}, data:{action}})
        
        let text = `💵 1000 ta - *${getOneService?.price}* so'm\n📉 Min - *${getOneService?.min}*\n📈 Max - *${getOneService?.max}*\n`+
        `⏰ Qo'shilish vaqti - *${getOneService?.time}*\n♻ Qayta tiklash - *${getOneService?.refill ? 'Mavjud':'Mavjud emas'}*\n\n`+
        `💹 *Sizning pulingiz ${maxCount.toFixed(0)} ta uchun yetadi*\n\n`+
        `_${info.uz}_`

        return {
            isActive: true,
            text: text,
            keyboard: {
                inline_keyboard: [
                    maxCount > min ? [{text: "🏷 Buyurtma berish", callback_data: request_id+'=setorder'}]:[{text: "🏷 Buyurtma berish", callback_data: request_id+'=cancelorder'}],
                    [{text: "🔙 Ortga", callback_data: request_id+'=back'}]
                ]
            }
        }
    } catch (error) {
        return {
            isActive:false,
            text: "Service vaqtincha ishlamayabdi",
            keyboard: {
                inline_keyboard: [[{text: "🔙 Ortga", callback_data: request_id+'=back'}]]
            }
        }
    }
}

const renderCobinetButton = async ():Promise<any> => {
    try {
        let settings = await prisma.setting.findFirst({where: {id: 1}})
        
        let data:any = new Array(settings?.cobinet_action || []).flat()
        
        let array:Array<Array<object>> = data.map((el: any) => {
            if(el.is_active) return [{ text: el.text, [el.keyboard]: el.key_value}] 
        }).filter((el: any) => el != undefined)
        console.log(array);
        
        return {
            inline_keyboard: array
        }
    } catch (error) {
        return {    
            inline_keyboard: []
        }
    }
}

export { rederCategoryKeyboard, renderPartnerKeyboard, renderServices,getOneService, renderCobinetButton, StatusTypes }