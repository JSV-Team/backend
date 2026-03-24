# 🛡️ Security Guidelines

## Environment Setup

### Required Environment Variables
```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Set in .env file
JWT_SECRET=your_generated_secret_here
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@host:port/db
```

## Security Features Implemented

### 1. Authentication & Authorization
- ✅ JWT token validation
- ✅ Role-based access control (Admin/User)
- ✅ IDOR protection with ownership checks
- ✅ Strong password requirements
- ✅ Secure password hashing (bcrypt)

### 2. Rate Limiting
- ✅ General API: 100 requests/15min
- ✅ Login attempts: 5 attempts/15min
- ✅ Registration: 3 attempts/hour
- ✅ File uploads: 20 uploads/15min

### 3. Input Validation
- ✅ Request body validation
- ✅ Parameter sanitization
- ✅ File type validation
- ✅ File content verification

### 4. Security Headers
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Content Security Policy
- ✅ XSS protection

### 5. File Upload Security
- ✅ File type restrictions
- ✅ File size limits (5MB)
- ✅ Content-based validation
- ✅ Secure filename generation

## Security Checklist for Deployment

### Before Going Live:
- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (64+ characters)
- [ ] Configure CLIENT_URL for CORS
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable logging and monitoring

### Regular Security Tasks:
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Rotate JWT secrets quarterly
- [ ] Security audit annually

## Incident Response

### If Security Breach Detected:
1. Immediately rotate JWT_SECRET
2. Force logout all users
3. Review access logs
4. Patch vulnerabilities
5. Notify affected users
6. Document incident

## Contact
For security issues, contact: [your-security-email]