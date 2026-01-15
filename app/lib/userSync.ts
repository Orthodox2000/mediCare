export interface UserPayload {
  uid: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider: "password" | "google" | "phone";
  photo: string | null;
  createdAt: string;
}

export const sendUserToMongo = async (user: UserPayload) => {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to insert user");
  }

  return true;
};
