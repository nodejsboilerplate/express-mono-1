import { seedUsers } from "./user.seed";

const main = async () => {
  const { userCount } = await seedUsers({ count: 20, addressesPerUser: 2 });
  console.log(`Seed complete ✅ (${userCount} users)`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed ⚠️", err);
    process.exit(1);
  });
