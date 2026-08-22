import { userAddresses, userContacts, userEmails, userPhones, userProfiles, users } from "@/database"
import type { UserAddressInsertType, UserAddressSelectType, UserContactInsertType, UserEmailsInsertType, UserEmailsSelectType, UserInsertType, UserPhonesInsertType, UserPhonesSelectType, UserProfileInsertType, UserSelectType } from "@/database/type"
import { pgDb } from "@/libs/db.connect"
import { validateWithZod } from "@/utils"
import { UserZValidation, type CreateUserInput } from "@/zod"
import type z from "zod"

interface UserServiceType {
    createUser(user: UserInsertType, profile?: UserProfileInsertType, contact?: UserContactInsertType, phones?: UserPhonesInsertType[], emails?: UserEmailsInsertType[], address?: UserAddressInsertType): Promise<string | z.ZodError>
    updateUserProfile(data: UserProfileInsertType): Promise<string>
    updateUserPhone(data: UserPhonesInsertType): Promise<string>
    updateUserEmail(data: UserEmailsInsertType): Promise<string>
    updateUserAddress(data: UserAddressInsertType): Promise<string>
    deleteUserPhone(id: Pick<UserPhonesSelectType, "id">): Promise<string>
    deleteUserEmail(id: Pick<UserEmailsSelectType, "id">): Promise<string>
    deleteUserAddress(id: Pick<UserAddressSelectType, "id">): Promise<string>
    deleteUser(id: Pick<UserSelectType, "id">): Promise<string>
}

export class UserService implements UserServiceType {
    async createUser(user: UserInsertType, profile: UserProfileInsertType, contact: UserContactInsertType, phones: UserPhonesInsertType[], emails: UserEmailsInsertType[], address: UserAddressInsertType): Promise<string | z.ZodError> {

        const playload: CreateUserInput = {
            user,
            profile: {
                ...profile, date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined
            },
            address: {
                addr_line_1: address.addr_line_1,
                addr_line_2: address.addr_line_2 ?? "",
                city: address.city,
                country: address.country,
                country_iso: address.country_iso,
                addr_name: address.addr_name ?? "",
                is_default: address.is_default,
                post_code: address.post_code ?? "",
                state: address.state ?? ""
            },
            contact: {
                socials: contact.socials ?? [],
            },
            emails,
            phones
        }
        const { data, error } = validateWithZod(playload, UserZValidation.createUser)

        if (error) {
            return error
        }

        const user_id: string = await pgDb.transaction(async (tx) => {
            const [createdUser] = await tx.insert(users).values(data.user).returning({ id: users.id })
            
            const userId = createdUser?.id!

            await tx.insert(userProfiles).values({ ...data.profile, user_id: userId, date_of_birth: data.profile?.date_of_birth ? data.profile?.date_of_birth.toISOString().split("T")[0] : undefined, })

            const [createdContact] = await tx.insert(userContacts).values({ ...data.contact, user_id: userId }).returning({ id: userContacts.id })

            const contactId = createdContact?.id!

            const modifiedPhones = data.phones?.map((p) => ({ ...p, contact_id: contactId }))
            await tx.insert(userPhones).values(modifiedPhones ?? [])

            const modifiedEmails = data.emails?.map((e) => ({ ...e, contact_id: contactId }))
            await tx.insert(userEmails).values(modifiedEmails ?? [])

            await tx.insert(userAddresses).values({ ...data.address!, user_id: userId })

            return userId
        })

        if (!user_id) {
            return ""
        }

        return user_id
    }

    async updateUserAddress(data: UserAddressInsertType): Promise<string> {

    }

    async updateUserEmail(data: UserEmailsInsertType): Promise<string> {

    }

    async updateUserPhone(data: UserPhonesInsertType): Promise<string> {

    }

    async updateUserProfile(data: UserProfileInsertType): Promise<string> {

    }

    async deleteUser(id: Pick<UserSelectType, "id">): Promise<string> {

    }

    async deleteUserAddress(id: Pick<UserAddressSelectType, "id">): Promise<string> {

    }

    async deleteUserEmail(id: Pick<UserEmailsSelectType, "id">): Promise<string> {

    }

    async deleteUserPhone(id: Pick<UserPhonesSelectType, "id">): Promise<string> {

    }


}