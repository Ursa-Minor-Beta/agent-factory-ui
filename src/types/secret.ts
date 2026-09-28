export interface Secret {
  id: string;
  name: string;
  maskedValue: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
