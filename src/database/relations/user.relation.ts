import { defineRelations } from "drizzle-orm";
import {
  userAddresses,
  userContactsTable,
  userEmails,
  userPhones,
  userProfilesTable,
  usersTable,
} from "../schemas";

export const userRelations = defineRelations(
  { usersTable, userProfilesTable, userContactsTable, userPhones, userEmails, userAddresses },
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
      contact_phones: r.many.userPhones({
        from: r.usersTable.id,
        to: r.userPhones.user_id,
      }),
      contact_emails: r.many.userEmails({
        from: r.usersTable.id,
        to: r.userEmails.user_id,
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
      phones: r.many.userPhones({
        from: r.userContactsTable.id,
        to: r.userPhones.contact_id,
      }),
      emails: r.many.userEmails({
        from: r.userContactsTable.id,
        to: r.userEmails.contact_id,
      }),
    },
    userPhones: {
      contact: r.one.userContactsTable({
        from: r.userPhones.contact_id,
        to: r.userContactsTable.id,
      }),
      user: r.one.usersTable({
        from: r.userPhones.user_id,
        to: r.usersTable.id,
      }),
    },
    userEmails: {
      contact: r.one.userContactsTable({
        from: r.userEmails.contact_id,
        to: r.userContactsTable.id,
      }),
      user: r.one.usersTable({
        from: r.userEmails.user_id,
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
