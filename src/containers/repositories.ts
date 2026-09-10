import { UserRepository } from "@/database/repositories";

export const createRepositories = () => {
  const userRepository = new UserRepository();

  return {
    userRepository,
  };
};
