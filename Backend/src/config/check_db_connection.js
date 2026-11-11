import { prisma } from "./database.js";

async function checkConnection() {
  try {
    await prisma.$queryRaw`SELECT version()`;
    console.log("MySQL connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();