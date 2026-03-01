const request = require('supertest');
const mongoose = require('mongoose');

let app, authToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  ({ app } = require('../src/server'));

  const email = `dev_test_${Date.now()}@example.com`;
  await request(app)
    .post('/api/auth/register')
    .send({ companyName: 'Dev Test Co', email, password: 'Password123!', confirmPassword: 'Password123!' });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password123!' });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Devices API', () => {
  let deviceId;

  test('GET /api/devices - should return empty device list', async () => {
    const res = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.devices)).toBe(true);
  });

  test('GET /api/devices - should require authentication', async () => {
    await request(app)
      .get('/api/devices')
      .expect(401);
  });

  test('POST /api/devices - should reject missing device name', async () => {
    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  test('POST /api/devices - should create a new device', async () => {
    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Device', phoneNumber: '+1234567890' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.device._id).toBeDefined();
    deviceId = res.body.device._id;
  });

  test('GET /api/devices/:deviceId - should return device by ID', async () => {
    if (!deviceId) return;
    const res = await request(app)
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.device._id).toBe(deviceId);
  });

  test('GET /api/devices/:deviceId - should return 404 for unknown ID', async () => {
    await request(app)
      .get(`/api/devices/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  test('DELETE /api/devices/:deviceId - should delete device', async () => {
    if (!deviceId) return;
    const res = await request(app)
      .delete(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
