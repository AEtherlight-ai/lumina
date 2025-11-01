---
name: Repository Pattern
category: database
tags: [repository, data-access, clean-architecture]
---

# Repository Pattern

## When to Use
- Abstracting data access logic
- Testing with mock data
- Switching between databases
- Clean architecture implementations

## Implementation
```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}

class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return await db.user.findUnique({ where: { id } });
  }

  async create(data: CreateUserDto): Promise<User> {
    return await db.user.create({ data });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return await db.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await db.user.delete({ where: { id } });
  }
}
```

## Best Practices
- Keep repositories focused on single entities
- Use DTOs for data transfer
- Implement proper error handling
- Add transaction support
- Use dependency injection
- Create interfaces for mockability
- Keep business logic out of repositories

## Related Patterns
- Unit of Work
- Data Transfer Objects (DTOs)
- Service Layer
