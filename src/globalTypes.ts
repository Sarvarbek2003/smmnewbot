enum ButtonType {
    back =  'back',
    cancel = 'cancel',
    setOrder = 'setorder',
    cancelOrder = 'cancelorder',
    confirm = 'confirm'
}

enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner',
    cobinet = 'cobinet',
    back = 'back',
    payme = 'payme'
}

class ActionType {
    back: string | undefined
    parner_id: number | undefined
    static back: any
}
export {ButtonType, SteepTypes, ActionType}