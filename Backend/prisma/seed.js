// Creates (or promotes) the first ADMIN account.
// Admins can never be created through the public register form.
//
//   1. Put ADMIN_EMAIL and ADMIN_PASSWORD in .env
//   2. npx prisma db seed

import { hashPassword } from "../src/utils/helper";
import { prisma } from "../src/config/database";
import { env } from "../src/config/env";

async function main() {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file");
  }

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: {
      name: "Admin",
      email,
      password: await hashPassword(password),
      role: "ADMIN",
      is_verified: true,
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());