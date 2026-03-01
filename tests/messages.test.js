const request = require('supertest');
const mongoose = require('mongoose');

let app, authToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  ({ app } = require('../src/server'));

  const email = `msg_test_${Date.now()}@example.com`;
  await request(app)
    .post('/api/auth/register')
    .send({ companyName: 'Msg Test Co', email, password: 'Password123!', confirmPassword: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Messages API', () => {
  test('GET /api/messages - should return message list', async () => {
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('GET /api/messages - should require authentication', async () => {
    await request(app)
      .get('/api/messages')
      .expect(401);
  });

  test('POST /api/messages/send - should reject missing phone number', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Hello' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test('POST /api/messages/send - should reject missing message', async () => {
    const res = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ recipientNumber: '+1234567890' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test('GET /api/messages/queue/status - should return queue status', async () => {
    const res = await request(app)
      .get('/api/messages/queue/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('GET /api/messages/bulk/jobs - should return bulk jobs list', async () => {
    const res = await request(app)
      .get('/api/messages/bulk/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });
});
