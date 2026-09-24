// Tests only need a synthetic configuration - the database connection is
// opened lazily, when something actually uses it.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://valandine:valandine@localhost:5432/valandine_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
