/**
 * Environment variable validation
 * Ensures all required environment variables are set before starting the server
 */

const validateEnvironment = () => {
  const required = [
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📝 Please check your .env file or environment configuration');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long for security');
    console.error('💡 Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.error(`❌ NODE_ENV must be one of: ${validEnvs.join(', ')}`);
    process.exit(1);
  }

  // Validate database configuration
  if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD)) {
    console.error('❌ Database configuration missing:');
    console.error('   Either set DATABASE_URL or all of: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  // Validate CORS in production
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    console.error('❌ CLIENT_URL is required in production for CORS security');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

module.exports = { validateEnvironment };