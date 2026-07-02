// Load test env before any module builds the pg pool.
require('dotenv').config({ path: '.env.test' });
