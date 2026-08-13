import { Role } from './roles';

export interface User {
  id: string;
  email: string;
  role: Role;
  hospitalId: string | null;
  firstName: string;
  lastName: string | null;
  createdAt: string; // dates cross the network as ISO strings, not Date objects
}