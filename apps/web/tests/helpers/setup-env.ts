import { inject } from "vitest";

process.env.DATABASE_URL = inject("databaseUrl");
process.env.DATABASE_SSL = "disable";
process.env.DATABASE_POOL_MAX = "30";
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret-0123456789abcdef";
process.env.CRON_SECRET = "test-cron-secret-0123456789abcdef0123456789";
process.env.APP_URL = "http://localhost:3000";
process.env.LOG_SILENT = "1";
process.env.BCRYPT_COST = "4";
