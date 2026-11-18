export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include upper-case, lower-case, a number and a special character.';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export const isStrongPassword = (p: string): boolean => PASSWORD_REGEX.test(p);
