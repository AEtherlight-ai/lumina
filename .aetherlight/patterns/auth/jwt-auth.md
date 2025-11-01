---
name: JWT Authentication
category: auth
tags: [jwt, authentication, security]
---

# JWT Authentication Pattern

## When to Use
- Stateless authentication
- API authentication
- Multi-service architectures

## Implementation
```typescript
// Token generation
function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Token verification middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}
```

## Best Practices
- Store secrets in environment variables
- Use refresh tokens for long sessions
- Implement token rotation
- Add rate limiting
- Never expose JWT_SECRET in code
- Set appropriate expiration times
- Validate token structure before verification

## Related Patterns
- API Authentication
- Session Management
- OAuth Integration
