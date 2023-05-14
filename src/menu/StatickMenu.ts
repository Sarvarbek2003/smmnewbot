import TelegramBot from "node-telegram-bot-api"

const home:TelegramBot.ReplyKeyboardMarkup = {
    resize_keyboard: true,
    keyboard:[
        [{text: '🛍 Buyurtma berish'}, {text: "🗃 Kabinet"}],
        [{text: '💡 Buyurtmani xolati'}, {text: "📞 Adminstrator"}]
    ]
}

const back:TelegramBot.ReplyKeyboardMarkup = {
    resize_keyboard: true,
    keyboard:[
        [{text: '🔙 Ortga'}]
    ]
}

const cancel:TelegramBot.ReplyKeyboardMarkup = {
    resize_keyboard: true,
    keyboard:[
        [{text: '🏠 Asosiy menu'}]
    ]
}

export {
    cancel,
    back,
    home
}