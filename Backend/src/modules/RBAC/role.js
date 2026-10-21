
export const ROLES = object.freeze({
    ADMIN: "ADMIN",
    PUBLISHER: "PUBLISHER",
    READER: "READER",
})

//user role on registeration form
export const SELF_REGISTER_ROLES = object.freeze([ROLES.READER,ROLES.PUBLISHER])