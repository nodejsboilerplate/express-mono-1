import type {
  userAddresses,
  userContacts,
  userEmails,
  userPhones,
  userProfilesTable,
  usersTable,
} from "./schemas";

// ---------------------------------------------------------
// User Types
// ---------------------------------------------------------
export type UserSelectType = typeof usersTable.$inferSelect;
export type UserInsertType = typeof usersTable.$inferInsert;

export type UserProfileSelectType = typeof userProfilesTable.$inferSelect;
export type UserProfileInsertType = typeof userProfilesTable.$inferInsert;

export type UserContactSelectType = typeof userContacts.$inferSelect;
export type UserContactInsertType = typeof userContacts.$inferInsert;

export type UserPhonesSelectType = typeof userPhones.$inferSelect;
export type UserPhonesInsertType = typeof userPhones.$inferInsert;

export type UserEmailsSelectType = typeof userEmails.$inferSelect;
export type UserEmailsInsertType = typeof userEmails.$inferInsert;

export type UserAddressSelectType = typeof userAddresses.$inferSelect;
export type UserAddressInsertType = typeof userAddresses.$inferInsert;
