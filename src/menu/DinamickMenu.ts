import { PrismaClient, services, setting, users } from "@prisma/client";
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
        
        let allCount = Number(user?.balance || 0) / (Number(getOneService!.price || 0) / 1000) 
        
        let text = `💵 1000 ta - *${getOneService?.price}* so'm\n📉 Min - *${getOneService?.min}*\n📈 Max - *${getOneService?.max}*\n`+
        `⏰ Qo'shilish vaqti - *${getOneService?.time}*\n♻ Qayta tiklash - *${getOneService?.refill ? 'Mavjud':'Mavjud emas'}*\n\n`+
        `💹 *Sizning pulingiz ${allCount.toFixed(0)} ta uchun yetadi*\n\n`+
        `_${info.uz}_`

        return {
            isActive: true,
            text: text,
            keyboard: {
                inline_keyboard: [
                    allCount > min ? [{text: "🏷 Buyurtma berish", callback_data: request_id+'=setorder'}]:[{text: "🏷 Buyurtma berish", callback_data: request_id+'=cancelorder'}],
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
export { rederCategoryKeyboard, renderPartnerKeyboard, renderServices,getOneService, StatusTypes }