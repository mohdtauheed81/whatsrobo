const request = require('supertest');
const mongoose = require('mongoose');

let app, authToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  ({ app } = require('../src/server'));

  // Register and login a test company
  const email = `sub_test_${Date.now()}@example.com`;
  await request(app)
    .post('/api/auth/register')
    .send({ companyName: 'Sub Test Co', email, password: 'Password123!', confirmPassword: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Subscription API', () => {
  test('GET /api/subscriptions/plans - should return active plans', async () => {
    const res = await request(app)
      .get('/api/subscriptions/plans')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.plans)).toBe(true);
  });

  test('GET /api/subscriptions/plans - should require authentication', async () => {
    await request(app)
      .get('/api/subscriptions/plans')
      .expect(401);
  });

  test('GET /api/subscriptions/current - should return current subscription', async () => {
    const res = await request(app)
      .get('/api/subscriptions/current')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toHaveProperty('isActive');
    expect(res.body.subscription).toHaveProperty('daysRemaining');
  });

  test('POST /api/subscriptions/upgrade - should reject missing planId', async () => {
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test('POST /api/subscriptions/upgrade - should reject non-existent plan', async () => {
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: new mongoose.Types.ObjectId().toString() })
      .expect(404);

    expect(res.body.error).toBeDefined();
  });
});
