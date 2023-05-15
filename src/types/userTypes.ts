import { users } from "@prisma/client";
class SelectUserResponse {
    user: users | undefined
    new_user: boolean | undefined
} 



export { SelectUserResponse }