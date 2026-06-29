import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://orientation:orientation@localhost:5432/orientation";

const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });
