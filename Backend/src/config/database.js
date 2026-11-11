import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";
import { env } from "./env.js";

console.log(env.MYSQL_HOST)

const adapter = new PrismaMariaDb({
  host: env.MYSQL_HOST,
  port:env.MYSQL_PORT,
  password:env.MYSQL_PASSWORD,
  user: env.MYSQL_USER,
  database: env.MYSQL_DATABASE,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true, 
});

const prisma = new PrismaClient({ adapter });

export { prisma };