const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { redisClient } = require('../src/config/redis');

describe('Application Endpoints', () => {
    const testUser = {
        email: `app_tester_${Date.now()}@example.com`,
        password: 'password123'
    };
    let token;
    let createdAppId;

    // Setup user and token
    beforeAll(async () => {
        const res = await request(app).post('/api/auth/register').send(testUser);
        const loginRes = await request(app).post('/api/auth/login').send(testUser);
        token = loginRes.body.token;
        if (redisClient.isReady) {
             await redisClient.flushAll();
        }
    });

    it('should create a new application', async () => {
        const res = await request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${token}`)
            .send({
                company_name: 'Tech Corp',
                position_title: 'Software Engineer',
                status: 'applied',
                notes: 'Found on LinkedIn'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.application).toHaveProperty('id');
        createdAppId = res.body.application.id;
    });

    it('should fetch applications (from DB first)', async () => {
        const res = await request(app)
            .get('/api/applications')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.applications.length).toBeGreaterThanOrEqual(1);
        expect(res.body.source).toEqual('db');
    });

    it('should fetch applications (from Cache second time)', async () => {
        if(!redisClient.isReady) {
             console.log("Redis not ready, skipping cache test");
             return;
        }

        const res = await request(app)
            .get('/api/applications')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.source).toEqual('cache');
    });

    it('should get a specific application', async () => {
        const res = await request(app)
            .get(`/api/applications/${createdAppId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.application.company_name).toEqual('Tech Corp');
    });

    it('should update an application', async () => {
        const res = await request(app)
            .put(`/api/applications/${createdAppId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'interviewing' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.application.status).toEqual('interviewing');
    });

    it('should delete an application', async () => {
        const res = await request(app)
            .delete(`/api/applications/${createdAppId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
    });

    // Teardown
    afterAll(async () => {
        await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    });
});
