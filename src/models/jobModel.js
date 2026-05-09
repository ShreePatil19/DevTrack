const db = require('../config/db');

class JobModel {
    static async findAll({ search, location, is_active = true, limit = 50, offset = 0 } = {}) {
        const conditions = ['is_active = $1'];
        const params = [is_active];
        let idx = 2;

        if (search) {
            conditions.push(`(title ILIKE $${idx} OR company ILIKE $${idx} OR description ILIKE $${idx})`);
            params.push(`%${search}%`);
            idx++;
        }

        if (location) {
            conditions.push(`location ILIKE $${idx}`);
            params.push(`%${location}%`);
            idx++;
        }

        params.push(limit, offset);
        const where = conditions.join(' AND ');

        const { rows } = await db.query(
            `SELECT * FROM jobs WHERE ${where} ORDER BY posted_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
            params
        );

        const { rows: countRows } = await db.query(
            `SELECT COUNT(*) FROM jobs WHERE ${where}`,
            params.slice(0, -2)
        );

        return { jobs: rows, total: parseInt(countRows[0].count, 10) };
    }

    static async findById(id) {
        const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
        return rows[0];
    }

    static async create(data) {
        const { title, company, description, location, job_url, source = 'manual' } = data;
        const { rows } = await db.query(
            `INSERT INTO jobs (title, company, description, location, job_url, source)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, company, description, location, job_url, source]
        );
        return rows[0];
    }

    static async update(id, data) {
        const { title, company, description, location, job_url, is_active } = data;
        const { rows } = await db.query(
            `UPDATE jobs
             SET title = COALESCE($1, title),
                 company = COALESCE($2, company),
                 description = COALESCE($3, description),
                 location = COALESCE($4, location),
                 job_url = COALESCE($5, job_url),
                 is_active = COALESCE($6, is_active)
             WHERE id = $7 RETURNING *`,
            [title, company, description, location, job_url, is_active, id]
        );
        return rows[0];
    }

    static async delete(id) {
        const { rowCount } = await db.query('DELETE FROM jobs WHERE id = $1', [id]);
        return rowCount > 0;
    }
}

module.exports = JobModel;
