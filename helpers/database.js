// helpers/database.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.qmeaeqmusayksrkeojfr:@Noy12345@aws-0-us-east-2.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false // ✅ if using Supabase
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
