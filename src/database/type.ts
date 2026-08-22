import type {
  userAddresses,
  userContacts,
  userEmails,
  userPhones,
  userProfiles,
  users,
} from "./schemas";

// ---------------------------------------------------------
// User Types
// ---------------------------------------------------------
export type UserSelectType = typeof users.$inferSelect;
export type UserInsertType = typeof users.$inferInsert;

export type UserProfileSelectType = typeof userProfiles.$inferSelect;
export type UserProfileInsertType = typeof userProfiles.$inferInsert;

export type UserContactSelectType = typeof userContacts.$inferSelect;
export type UserContactInsertType = typeof userContacts.$inferInsert;

export type UserPhonesSelectType = typeof userPhones.$inferSelect;
export type UserPhonesInsertType = typeof userPhones.$inferInsert;

export type UserEmailsSelectType = typeof userEmails.$inferSelect;
export type UserEmailsInsertType = typeof userEmails.$inferInsert;

export type UserAddressSelectType = typeof userAddresses.$inferSelect;
export type UserAddressInsertType = typeof userAddresses.$inferInsert;
