
export const ROLES = object.freeze({
    ADMIN: "ADMIN",
    PUBLISHER: "PUBLISHER",
    READER: "READER",
})

//user role on registeration form
export const SELF_REGISTER_ROLE = object.freeze([ROLES.READER,ROLES.PUBLISHER])