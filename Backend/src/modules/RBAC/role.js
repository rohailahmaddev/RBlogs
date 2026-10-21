
export const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    PUBLISHER: "PUBLISHER",
    READER: "READER",
})

//user role on registeration form
export const SELF_REGISTER_ROLES = Object.freeze([ROLES.READER,ROLES.PUBLISHER])