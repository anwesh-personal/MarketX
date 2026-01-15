import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

async function createSuperadmin() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/axiom',
    });

    try {
        console.log('\n🔐 Create Superadmin Account\n');

        const email = await question('Email: ');
        const fullName = await question('Full Name: ');
        const password = await question('Password (min 8 chars): ');
        const confirmPassword = await question('Confirm Password: ');

        if (password !== confirmPassword) {
            console.error('❌ Passwords do not match!');
            process.exit(1);
        }

        if (password.length < 8) {
            console.error('❌ Password must be at least 8 characters!');
            process.exit(1);
        }

        // Check if admin already exists
        const { rows: existing } = await pool.query(
            'SELECT id FROM platform_admins WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            console.error('❌ Admin with this email already exists!');
            process.exit(1);
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create admin
        const { rows } = await pool.query(
            `INSERT INTO platform_admins (email, full_name, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, full_name`,
            [email, fullName, password_hash]
        );

        const admin = rows[0];

        console.log('\n✅ Superadmin created successfully!');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.full_name}`);
        console.log('\n🚀 You can now login at /superadmin/login\n');

    } catch (error) {
        console.error('❌ Error creating superadmin:', error);
        process.exit(1);
    } finally {
        await pool.end();
        rl.close();
    }
}

createSuperadmin();
