import type { CustomerProfile, PolicyMap } from "./types";

const createEmptyPolicyMap = (): PolicyMap => ({
  home: null,
  auto: null,
});

export const ensurePolicyMap = (profile: CustomerProfile): PolicyMap => {
  if (!profile.policies) {
    profile.policies = createEmptyPolicyMap();
    return profile.policies;
  }

  profile.policies.home ??= null;
  profile.policies.auto ??= null;

  return profile.policies;
};

class MemoryDB {
  profile: CustomerProfile;

  constructor() {
    this.profile = {
      id: 1,
      first_name: "Zeke",
      last_name: "Negron",
      email: "zeke@samuraicode.ai",
      phone: "(614) 284-8925",
      address: "1282 Belle Meade Place",
      city: "Westerville",
      state: "OH",
      zip: "43081",
      policies: createEmptyPolicyMap(),
    };

    ensurePolicyMap(this.profile);
  }
}

const globalForDB = globalThis as unknown as { _db?: MemoryDB };

if (globalForDB._db) {
  ensurePolicyMap(globalForDB._db.profile);
}

export const db = globalForDB._db || (globalForDB._db = new MemoryDB());
