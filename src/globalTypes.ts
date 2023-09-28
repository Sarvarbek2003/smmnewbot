import TelegramBot from "node-telegram-bot-api"
enum ButtonType {
    back =  'back',
    cancel = 'cancel',
    backOrder = 'backOrder',
    setOrder = 'setorder',
    payme = 'payme',
    cancelOrder = 'cancelorder',
    confirm = 'confirm',
    check = 'check',
    add_partner = 'add_partner',
    paynet = 'paynet',
    gethome = '🏠 Asosiy menu',
    start = '/start'
}

enum SteepTypes {
    choose_vote = 'choose_vote',
    setOrder = 'setorder',
    write_summa = 'write_summa',
    getpartner = 'getparner',
    cobinet = 'cobinet',
    checkOrder = 'checkOrder',
    back = 'back',
    getservices = "getservices",
    paynet = "paynet"
}

enum ServiceType { 
    default = 'default',
    poll = 'poll'
}

class ActionType {
    back: string | undefined
    parner_id: number | undefined
    static back: any
}

class TelegramBtn {
    home:TelegramBot.ReplyKeyboardMarkup | undefined
    back :TelegramBot.ReplyKeyboardMarkup | undefined
    cancel: TelegramBot.ReplyKeyboardMarkup | undefined
}

export {ButtonType, SteepTypes, ActionType, ServiceType, TelegramBtn}