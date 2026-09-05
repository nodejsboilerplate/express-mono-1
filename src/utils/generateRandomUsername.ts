import { generate } from "random-words";

export const generateRandomUsername = (): string => {
  let word: string;
  do {
    word = (generate(1) as string[])[0]?.replace(/[^a-zA-Z0-9]/g, "")!;
  } while (word.length < 3 || word.length > 13);

  word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

  const suffix = Math.floor(1000000 + Math.random() * 9000000);
  return `${word}${suffix}`; // "Falcon4839201"
};
