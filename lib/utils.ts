import { USER_ID_KEY } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export const getUserId = (): string => {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};
