import "dotenv/config";
import { defineConfig, env } from "prisma/config";
// import {env} from "./src/config/env.js"

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.js",
  },
    datasource: {
    url: env("DATABASE_URL"),
  },
});
