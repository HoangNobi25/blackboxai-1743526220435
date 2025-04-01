const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const logger = require('../utils/logger');

// Configuration for the initial manager account
const initialManager = {
    email: 'admin@example.com',
    password: 'admin123', // This should be changed after first login
    name: 'System Administrator',
    position: 'Manager',
    hourly_wage: 200, // Default hourly wage in CZK
    bank_account: '0000000000',
    bank_name: 'Default Bank'
};

async function createInitialManager() {
    return new Promise((resolve, reject) => {
        // Check if manager already exists
        db.get('SELECT * FROM USER WHERE email = ?', [initialManager.email], (err, user) => {
            if (err) {
                logger.error('Error checking for existing manager:', err);
                reject(err);
                return;
            }

            if (user) {
                logger.info('Manager account already exists');
                resolve();
                return;
            }

            // Hash the password
            bcrypt.hash(initialManager.password, 12, (err, hashedPassword) => {
                if (err) {
                    logger.error('Error hashing password:', err);
                    reject(err);
                    return;
                }

                // Start transaction
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');

                    // Create user record
                    db.run(
                        'INSERT INTO USER (email, password, role) VALUES (?, ?, ?)',
                        [initialManager.email, hashedPassword, 'manager'],
                        function(err) {
                            if (err) {
                                logger.error('Error creating user record:', err);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }

                            const userId = this.lastID;

                            // Create employee record
                            db.run(
                                `INSERT INTO EMPLOYEE (
                                    user_id, name, hourly_wage, position, bank_account, bank_name
                                ) VALUES (?, ?, ?, ?, ?, ?)`,
                                [
                                    userId,
                                    initialManager.name,
                                    initialManager.hourly_wage,
                                    initialManager.position,
                                    initialManager.bank_account,
                                    initialManager.bank_name
                                ],
                                (err) => {
                                    if (err) {
                                        logger.error('Error creating employee record:', err);
                                        db.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }

                                    db.run('COMMIT');
                                    logger.info('Initial manager account created successfully');
                                    logger.info(`Email: ${initialManager.email}`);
                                    logger.info(`Password: ${initialManager.password}`);
                                    logger.warn('Please change the password after first login!');
                                    resolve();
                                }
                            );
                        }
                    );
                });
            });
        });
    });
}

// Execute if run directly
if (require.main === module) {
    // Initialize database first
    require('../config/database').initializeDatabase()
        .then(() => {
            createInitialManager()
                .then(() => process.exit(0))
                .catch((error) => {
                    logger.error('Failed to create initial manager:', error);
                    process.exit(1);
                });
        })
        .catch((error) => {
            logger.error('Failed to initialize database:', error);
            process.exit(1);
        });
}

module.exports = { createInitialManager };