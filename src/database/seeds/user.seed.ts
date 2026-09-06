// seed/user.seed.ts
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import {
  usersTable,
  userProfilesTable,
  userContactsTable,
  userPhonesTable,
  userEmailsTable,
  userAddressesTable,
} from "@/database";
import { pgDb } from "@/libs/db.connect";

type UserInsert = typeof usersTable.$inferInsert;
type UserProfileInsert = typeof userProfilesTable.$inferInsert;
type UserContactInsert = typeof userContactsTable.$inferInsert;
type UserPhoneInsert = typeof userPhonesTable.$inferInsert;
type UserEmailInsert = typeof userEmailsTable.$inferInsert;
type UserAddressInsert = typeof userAddressesTable.$inferInsert;

interface SeedUsersOptions {
  count?: number;
  addressesPerUser?: number;
}

export async function seedUsers(options: SeedUsersOptions = {}) {
  const { count = 20, addressesPerUser = 1 } = options;

  // -- Build users
  const usersData: UserInsert[] = Array.from({ length: count }).map(() => ({
    id: uuidv4(),
    email: faker.internet.email().toLowerCase(),
    username: faker.internet.username().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    is_verified: true,
    role: "USER",
    provider: "MANUAL",
  }));

  const users = await pgDb.insert(usersTable).values(usersData).returning({
    id: usersTable.id,
  });

  // -- Build profiles (1:1)
  const profilesData: UserProfileInsert[] = users.map((user) => ({
    id: uuidv4(),
    user_id: user.id,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    avatar: faker.image.avatar(),
    cover_img: faker.image.url(),
    nickname: faker.internet.username().toLowerCase(),
    date_of_birth: faker.date.birthdate().toISOString().split("T")[0],
    gender: faker.helpers.arrayElement(["MALE", "FEMALE", "OTHER"]),
  }));

  const profiles = await pgDb
    .insert(userProfilesTable)
    .values(profilesData)
    .returning({
      user_id: userProfilesTable.user_id,
      first_name: userProfilesTable.first_name,
      last_name: userProfilesTable.last_name,
    });

  // -- Build contacts (1:1)
  const contactsData: UserContactInsert[] = profiles.map((profile) => ({
    id: uuidv4(),
    user_id: profile.user_id,
    socials: [
      { type: "facebook", url: faker.internet.url() },
      { type: "twitter", url: faker.internet.url() },
    ],
  }));

  const contacts = await pgDb
    .insert(userContactsTable)
    .values(contactsData)
    .returning({
      id: userContactsTable.id,
      user_id: userContactsTable.user_id,
    });

  const profileByUserId = new Map(profiles.map((p) => [p.user_id, p]));

  // -- Build phones (1:1 with user, tied to contact)
  const phonesData: UserPhoneInsert[] = contacts.map((contact) => ({
    id: uuidv4(),
    contact_id: contact.id,
    user_id: contact.user_id,
    is_verified: faker.datatype.boolean(),
    is_primary: true,
    phone_code: "+880",
    phone: faker.string.numeric(10),
  }));

  await pgDb.insert(userPhonesTable).values(phonesData);

  // -- Build emails (1:1 with user, tied to contact)
  const emailsData: UserEmailInsert[] = contacts.map((contact) => {
    const profile = profileByUserId.get(contact.user_id);
    return {
      id: uuidv4(),
      contact_id: contact.id,
      user_id: contact.user_id,
      is_verified: faker.datatype.boolean(),
      is_primary: true,
      email: faker.internet.email({
        firstName: profile?.first_name,
        lastName: profile?.last_name ?? undefined,
      }),
    };
  });

  await pgDb.insert(userEmailsTable).values(emailsData);

  // -- Build addresses (many per user)
  const addressesData: UserAddressInsert[] = users.flatMap((user) =>
    Array.from({ length: addressesPerUser }).map((_, i) => ({
      id: uuidv4(),
      user_id: user.id,
      addr_name: i === 0 ? "Home" : faker.word.adjective(),
      addr_line_1: faker.location.streetAddress(),
      addr_line_2: faker.location.secondaryAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      post_code: faker.location.zipCode(),
      country: faker.location.country(),
      country_iso: faker.location.countryCode("alpha-2"),
      is_default: i === 0,
    }))
  );

  await pgDb.insert(userAddressesTable).values(addressesData);

  return { userCount: users.length };
}
