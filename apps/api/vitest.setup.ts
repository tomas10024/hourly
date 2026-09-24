// Tests only need a synthetic configuration - the database connection is
// opened lazily, when something actually uses it.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://hourly:hourly@localhost:5432/hourly_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';
