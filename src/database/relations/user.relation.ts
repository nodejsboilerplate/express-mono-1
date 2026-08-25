import { defineRelations } from "drizzle-orm";
import {
  userAddresses,
  userContactsTable,
  userEmailsTable,
  userPhonesTable,
  userProfilesTable,
  usersTable,
} from "../schemas";

export const userRelations = defineRelations(
  { usersTable, userProfilesTable, userContactsTable, userPhonesTable, userEmailsTable, userAddresses },
  (r) => ({
    users: {
      profile: r.one.userProfilesTable({
        from: r.usersTable.id,
        to: r.userProfilesTable.user_id,
      }),
      contact: r.one.userContactsTable({
        from: r.usersTable.id,
        to: r.userContactsTable.user_id,
      }),
      contact_phones: r.many.userPhonesTable({
        from: r.usersTable.id,
        to: r.userPhonesTable.user_id,
      }),
      contact_emails: r.many.userEmailsTable({
        from: r.usersTable.id,
        to: r.userEmailsTable.user_id,
      }),
      addresses: r.many.userAddresses({
        from: r.usersTable.id,
        to: r.userAddresses.user_id,
      }),
    },
    userProfiles: {
      user: r.one.usersTable({
        from: r.userProfilesTable.user_id,
        to: r.usersTable.id,
      }),
    },
    userContacts: {
      user: r.one.usersTable({
        from: r.userContactsTable.user_id,
        to: r.usersTable.id,
      }),
      phones: r.many.userPhonesTable({
        from: r.userContactsTable.id,
        to: r.userPhonesTable.contact_id,
      }),
      emails: r.many.userEmailsTable({
        from: r.userContactsTable.id,
        to: r.userEmailsTable.contact_id,
      }),
    },
    userPhones: {
      contact: r.one.userContactsTable({
        from: r.userPhonesTable.contact_id,
        to: r.userContactsTable.id,
      }),
      user: r.one.usersTable({
        from: r.userPhonesTable.user_id,
        to: r.usersTable.id,
      }),
    },
    userEmails: {
      contact: r.one.userContactsTable({
        from: r.userEmailsTable.contact_id,
        to: r.userContactsTable.id,
      }),
      user: r.one.usersTable({
        from: r.userEmailsTable.user_id,
        to: r.usersTable.id,
      }),
    },
    userAddresses: {
      user: r.one.usersTable({
        from: r.userAddresses.user_id,
        to: r.usersTable.id,
      }),
    },
  })
);
