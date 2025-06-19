# Dev-Sketch Contributing Guidelines

## Code Quality & Standards

### General Principles
- Write clean, readable, and maintainable code
- Prioritize code readability over cleverness
- Document complex logic and algorithms

### TypeScript Best Practices
- Use strict mode
- Prefer interfaces over type aliases
- Leverage generics and advanced type features
- Avoid `any` type whenever possible

### React Component Guidelines
- Use functional components with hooks
- Keep components small and focused
- Implement proper prop types
- Use React.memo for performance optimization
- Follow container/presentational component pattern

### Performance Considerations
- Minimize re-renders with useCallback
- Implement lazy loading for complex components
- Use code splitting in Next.js
- Optimize WebSocket and WebRTC connections

## Development Workflow

### Branch Strategy
- `main`: Stable production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `hotfix/*`: Critical bug fixes

### Commit Message Convention
```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

#### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Process
1. Create a detailed PR description
2. Link related issues
3. Provide screenshots for UI changes
4. Require at least two approvals
5. Pass all automated checks

## Testing Strategy

### Testing Pyramid
- Unit Tests: 70%
- Integration Tests: 20%
- End-to-End Tests: 10%

### Test Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for critical paths
- Snapshot testing for UI components

## Code Review Checklist

### General
- Code follows style guidelines
- Comments added for complex logic
- No unnecessary comments
- Proper error handling

### Performance
- No unnecessary re-renders
- Optimized WebSocket handling
- Efficient state management

### Security
- No hardcoded credentials
- Input validation
- Proper authentication checks

## Development Environment Setup

### Prerequisites
- Node.js v18+
- pnpm
- PostgreSQL - Prisma ORM (neonDB recommended)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/RISHIK92/dev-sketch.git

# Install dependencies
pnpm install

# Set up environment variables
cp .env

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

## Continuous Integration

### GitHub Actions Workflow
- Automated testing on every PR
- type-check
- Build verification
- Security scanning

## Documentation Standards
- Keep README.md updated
- Document complex components
- Maintain CHANGELOG.md
- Create inline documentation for complex logic

## Performance Monitoring
- Use Chrome DevTools
- Monitor WebSocket connection times
- Track real-time collaboration latency

## Security Best Practices
- Regular dependency updates
- Use GitHub's Dependabot
- Implement rate limiting
- Use OWASP security guidelines

## Contribution Guidelines
- Read and follow the code of conduct
- Submit detailed issue reports
- Discuss major changes before implementation
- Be respectful and constructive
