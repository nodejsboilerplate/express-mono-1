import type {
  userAddressesTable,
  userContactsTable,
  userEmailsTable,
  userPhonesTable,
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

export type UserContactSelectType = typeof userContactsTable.$inferSelect;
export type UserContactInsertType = typeof userContactsTable.$inferInsert;

export type UserPhonesSelectType = typeof userPhonesTable.$inferSelect;
export type UserPhonesInsertType = typeof userPhonesTable.$inferInsert;

export type UserEmailsSelectType = typeof userEmailsTable.$inferSelect;
export type UserEmailsInsertType = typeof userEmailsTable.$inferInsert;

export type UserAddressSelectType = typeof userAddressesTable.$inferSelect;
export type UserAddressInsertType = typeof userAddressesTable.$inferInsert;
