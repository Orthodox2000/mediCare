export interface CachedUser {
  uid: string;
  email: string | null;
  name?: string;
  phone?: string;
}

const KEY = "medicare_user";

export const saveUserToCache = (user: CachedUser) => {
  localStorage.setItem(KEY, JSON.stringify(user));
};

export const getCachedUser = (): CachedUser | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(KEY);
  return data ? JSON.parse(data) : null;
};

export const clearCachedUser = () => {
  localStorage.removeItem(KEY);
};
