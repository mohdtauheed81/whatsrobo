const request = require('supertest');
const mongoose = require('mongoose');

let app;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  // Import app after env is set up
  ({ app } = require('../src/server'));
});

afterAll(async () => {
  // Clean test data
  await mongoose.connection.dropCollection('companies').catch(() => {});
  await mongoose.connection.close();
});

describe('Auth API', () => {
  const testCompany = {
    companyName: 'Test Company',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!'
  };
  let authToken;

  // ─── Registration ─────────────────────────────────────────────────────────

  test('POST /api/auth/register - should register a new company', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testCompany)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.company.email).toBe(testCompany.email);
    expect(res.body.company.password).toBeUndefined(); // password must not be returned
  });

  test('POST /api/auth/register - should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testCompany)
      .expect(409);

    expect(res.body.error).toBeDefined();
  });

  test('POST /api/auth/register - should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testCompany, email: 'not-an-email' })
      .expect(400);

    expect(res.body.errors || res.body.error).toBeDefined();
  });

  test('POST /api/auth/register - should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testCompany, email: 'other@test.com', password: '123', confirmPassword: '123' })
      .expect(400);

    expect(res.body.errors || res.body.error).toBeDefined();
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  test('POST /api/auth/login - should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testCompany.email, password: testCompany.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  test('POST /api/auth/login - should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testCompany.email, password: 'WrongPassword!' })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });

  test('POST /api/auth/login - should reject unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'Password123!' })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });

  // ─── Profile ─────────────────────────────────────────────────────────────

  test('GET /api/auth/profile - should return profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.company.email).toBe(testCompany.email);
  });

  test('GET /api/auth/profile - should reject missing token', async () => {
    await request(app)
      .get('/api/auth/profile')
      .expect(401);
  });

  test('GET /api/auth/profile - should reject invalid token', async () => {
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });

  // ─── Logout ───────────────────────────────────────────────────────────────

  test('POST /api/auth/logout - should logout successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
