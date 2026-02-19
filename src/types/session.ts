export type Session = {
  userId: number;
  serverCode: string;
  name: string;
  role: "admin" | "superadmin";
};
