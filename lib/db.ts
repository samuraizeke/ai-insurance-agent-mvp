import { CustomerProfile } from "./types";

class MemoryDB {
profile: CustomerProfile;
constructor() {
this.profile = {
id: "demo-user",
name: "Demo Customer",
email: "demo@example.com",
phone: "(555) 010-0000",
address: "123 Main St, Springfield, USA",
policy: null,
};
}
}

const globalForDB = global as unknown as { _db?: MemoryDB };
export const db = globalForDB._db || (globalForDB._db = new MemoryDB());