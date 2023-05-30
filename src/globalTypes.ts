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
    gethome = '🏠 Asosiy menu',
    start = '/start'
}

enum SteepTypes {
    setOrder = 'setorder',
    write_summa = 'write_summa',
    getpartner = 'getparner',
    cobinet = 'cobinet',
    checkOrder = 'checkOrder',
    back = 'back',
    getservices = "getservices"
}

class ActionType {
    back: string | undefined
    parner_id: number | undefined
    static back: any
}
export {ButtonType, SteepTypes, ActionType}