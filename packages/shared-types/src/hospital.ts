export interface Hospital {
  id: string;
  name: string;
  slug: string;
  status: string;
  addressId: string | null;
  createdAt: string;
}