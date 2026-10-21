import { env } from "./env.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

console.log(env.DATABASE_HOST)
const adapter = new PrismaMariaDb({
  host: env.DATABASE_HOST,
  port:env.DATABASE_PORT,
  user: env.DATABASE_USER,
  database: env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

export { prisma };