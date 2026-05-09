const db = require('../config/db');

class ResumeModel {
    static async findAllByUserId(userId) {
        const { rows } = await db.query(
            'SELECT * FROM resumes WHERE user_id = $1 ORDER BY is_default DESC, updated_at DESC',
            [userId]
        );
        return rows;
    }

    static async findById(id, userId) {
        const { rows } = await db.query(
            'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return rows[0];
    }

    static async create(userId, data) {
        const { name, file_url, version = '1.0', is_default = false } = data;

        // If setting as default, clear existing default first
        if (is_default) {
            await db.query(
                'UPDATE resumes SET is_default = FALSE WHERE user_id = $1',
                [userId]
            );
        }

        const { rows } = await db.query(
            `INSERT INTO resumes (user_id, name, file_url, version, is_default)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, name, file_url, version, is_default]
        );
        return rows[0];
    }

    static async update(id, userId, data) {
        const existing = await this.findById(id, userId);
        if (!existing) return null;

        const { name, file_url, version, is_default } = data;

        if (is_default) {
            await db.query(
                'UPDATE resumes SET is_default = FALSE WHERE user_id = $1',
                [userId]
            );
        }

        const { rows } = await db.query(
            `UPDATE resumes
             SET name = COALESCE($1, name),
                 file_url = COALESCE($2, file_url),
                 version = COALESCE($3, version),
                 is_default = COALESCE($4, is_default),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6 RETURNING *`,
            [name, file_url, version, is_default, id, userId]
        );
        return rows[0];
    }

    static async delete(id, userId) {
        const { rowCount } = await db.query(
            'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return rowCount > 0;
    }

    static async setDefault(id, userId) {
        await db.query('UPDATE resumes SET is_default = FALSE WHERE user_id = $1', [userId]);
        const { rows } = await db.query(
            'UPDATE resumes SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        return rows[0];
    }
}

module.exports = ResumeModel;
