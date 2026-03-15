const db = require('../config/db');

class UserModel {
    static async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    }

    static async findById(id) {
        const { rows } = await db.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [id]);
        return rows[0];
    }

    static async create(email, passwordHash, role = 'user') {
        const { rows } = await db.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [email, passwordHash, role]
        );
        return rows[0];
    }
}

module.exports = UserModel;
