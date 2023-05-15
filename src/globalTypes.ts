enum ButtonType {
    back =  'back',
    cancel = 'cancel',
    setOrder = 'setorder',
    cancelOrder = 'cancelorder',
    confirm = 'confirm'
}

enum SteepTypes {
    setOrder = 'setorder',
    getpartner = 'getparner'
}

class ActionType {
    back: string | undefined
    parner_id: number | undefined
}
export {ButtonType, SteepTypes, ActionType}