import { defineRelations } from "drizzle-orm";
import {
  userAddresses,
  userContacts,
  userEmails,
  userPhones,
  userProfiles,
  users,
} from "../schemas";

export const userRelations = defineRelations(
  { users, userProfiles, userContacts, userPhones, userEmails, userAddresses },
  (r) => ({
    users: {
      profile: r.one.userProfiles({
        from: r.users.id,
        to: r.userProfiles.user_id,
      }),
      contact: r.one.userContacts({
        from: r.users.id,
        to: r.userContacts.user_id,
      }),
      contact_phones: r.many.userPhones({
        from: r.users.id,
        to: r.userPhones.user_id
      }),
      contact_emails: r.many.userEmails({
        from: r.users.id,
        to: r.userEmails.user_id
      }),
      addresses: r.many.userAddresses({
        from: r.users.id,
        to: r.userAddresses.user_id,
      }),
    },
    userProfiles: {
      user: r.one.users({
        from: r.userProfiles.user_id,
        to: r.users.id,
      }),
    },
    userContacts: {
      user: r.one.users({
        from: r.userContacts.user_id,
        to: r.users.id,
      }),
      phones: r.many.userPhones({
        from: r.userContacts.id,
        to: r.userPhones.contact_id,
      }),
      emails: r.many.userEmails({
        from: r.userContacts.id,
        to: r.userEmails.contact_id,
      }),
    },
    userPhones: {
      contact: r.one.userContacts({
        from: r.userPhones.contact_id,
        to: r.userContacts.id,
      }),
      user: r.one.users({
        from: r.userPhones.user_id,
        to: r.users.id
      })
    },
    userEmails: {
      contact: r.one.userContacts({
        from: r.userEmails.contact_id,
        to: r.userContacts.id,
      }),
      user: r.one.users({
        from: r.userEmails.user_id,
        to: r.users.id
      })
    },
    userAddresses: {
      user: r.one.users({
        from: r.userAddresses.user_id,
        to: r.users.id,
      }),
    },
  })
);
