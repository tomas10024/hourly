// Testams pakanka sintetinės konfigūracijos - duomenų bazės jungtis
// atveriama tik ją realiai naudojant.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://valandine:valandine@localhost:5432/valandine_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789';
