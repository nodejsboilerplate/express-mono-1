import { UserInputValidators } from "@/validators/inputs";

export const createValidators = () => {
  const userInputValidators = new UserInputValidators();

  return {
    userInputValidators,
  };
};
