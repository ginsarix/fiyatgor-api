export type Session = {
  userId: number;
  firmCode: string;
  name: string;
  role: "admin" | "superadmin";
};
