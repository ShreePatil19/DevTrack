const db = require('../config/db');

class ApplicationModel {
    static async findAllByUserId(userId) {
        const { rows } = await db.query(
            'SELECT * FROM applications WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        return rows;
    }

    static async findById(id, userId) {
        const { rows } = await db.query(
            'SELECT * FROM applications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return rows[0];
    }

    static async create(userId, data) {
        const { company_name, position_title, status = 'applied', job_url, notes } = data;
        const { rows } = await db.query(
            `INSERT INTO applications (user_id, company_name, position_title, status, job_url, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, company_name, position_title, status, job_url, notes]
        );
        
        // Log history
        await db.query(
            'INSERT INTO status_history (application_id, new_status, notes) VALUES ($1, $2, $3)',
            [rows[0].id, status, 'Initial application creation']
        );

        return rows[0];
    }

    static async update(id, userId, data) {
        const currentApp = await this.findById(id, userId);
        if (!currentApp) return null;

        const { company_name, position_title, status, job_url, notes } = data;
        
        const { rows } = await db.query(
            `UPDATE applications
             SET company_name = COALESCE($1, company_name),
                 position_title = COALESCE($2, position_title),
                 status = COALESCE($3, status),
                 job_url = COALESCE($4, job_url),
                 notes = COALESCE($5, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND user_id = $7 RETURNING *`,
            [company_name, position_title, status, job_url, notes, id, userId]
        );

        // Manage status history if status changed
        if (status && status !== currentApp.status) {
            await db.query(
                'INSERT INTO status_history (application_id, previous_status, new_status) VALUES ($1, $2, $3)',
                [id, currentApp.status, status]
            );
        }

        return rows[0];
    }

    static async delete(id, userId) {
        const { rowCount } = await db.query(
            'DELETE FROM applications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return rowCount > 0;
    }
}

module.exports = ApplicationModel;
