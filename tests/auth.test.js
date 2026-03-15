const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Auth Endpoints', () => {
    const testUser = {
        email: `test_user_${Date.now()}@example.com`,
        password: 'password123'
    };

    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);
            
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user.email).toEqual(testUser.email);
    });

    it('should fail registration with duplicate email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);
            
        expect(res.statusCode).toEqual(409);
    });

    it('should login and return a token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(testUser);
            
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ ...testUser, password: 'wrongpassword' });
            
        expect(res.statusCode).toEqual(401);
    });

    it('should get authenticated user profile', async () => {
        // Login first
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send(testUser);
        
        const token = loginRes.body.token;

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
            
        expect(res.statusCode).toEqual(200);
        expect(res.body.user.email).toEqual(testUser.email);
    });

    // Clean up test user
    afterAll(async () => {
        await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    });
});
