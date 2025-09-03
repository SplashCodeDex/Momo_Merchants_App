# Contributing to MoMo Merchant Companion App

Thank you for your interest in contributing to the MoMo Merchant Companion App! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Write-Ahead Intent (WAI)](#-write-ahead-intent-wai)
- [Coding Standards](#-coding-standards)
- [Testing Guidelines](#-testing-guidelines)
- [Commit Conventions](#-commit-conventions)
- [Pull Request Process](#-pull-request-process)
- [Documentation](#-documentation)
- [Reporting Issues](#-reporting-issues)

## 🤝 Code of Conduct

This project adheres to a code of conduct that promotes a harassment-free environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors
- Help create a positive community

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **React Native CLI**: For mobile development
- **Android Studio**: For Android development (optional)
- **Xcode**: For iOS development (macOS only, optional)

### Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/momo-merchant-app.git
   cd momo-merchant-app
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/momo-merchant-app.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
6. **Verify setup**:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

## 🔄 Development Workflow

### 1. Choose an Issue

- Check the [Issues](https://github.com/your-org/momo-merchant-app/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Feature Branch

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Write-Ahead Intent (WAI)

**Before writing any code**, create a WAI document:

```bash
cp docs/templates/wai-template.md docs/Projects/P-your-feature-wai.md
```

Edit the WAI document with:
- **Intent**: What you plan to accomplish
- **Rationale**: Why this change is necessary
- **Expected Outcome**: Measurable success criteria
- **Alternatives Considered**: Other approaches evaluated

### 4. Development

```bash
# Start development servers
npm run dev

# Run quality checks
npm run lint
npm run typecheck
npm run test
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add user authentication flow"
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## 📝 Write-Ahead Intent (WAI)

The **Write-Ahead Intent** is a core principle of our development methodology. It ensures:

- **Clarity of purpose** before implementation
- **Documentation of rationale** for future reference
- **Prevention of scope creep** through defined outcomes
- **Knowledge transfer** for team continuity

### WAI Template Structure

```markdown
# Write-Ahead Intent: [Feature Name]

## Intent
[Clear statement of what will be accomplished]

## Rationale
[Why this change is necessary. Link to requirements, issues, or business needs]

## Expected Outcome
[Specific, measurable success criteria]

## Alternatives Considered
[Other approaches evaluated and why they were not chosen]

## Implementation Notes
[Technical approach, dependencies, potential challenges]

## Testing Strategy
[How this feature will be tested]

## Documentation Updates
[What documentation needs to be updated]

## Rollback Plan
[How to revert this change if needed]
```

## 💻 Coding Standards

### TypeScript

- **Strict mode**: All TypeScript files use strict type checking
- **Explicit types**: Avoid `any` type; use specific types
- **Interface vs Type**: Use `interface` for object shapes, `type` for unions
- **Naming conventions**:
  - Interfaces: `PascalCase` (e.g., `UserProfile`)
  - Types: `PascalCase` (e.g., `ApiResponse<T>`)
  - Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

### React/React Native

- **Functional components**: Use function components with hooks
- **Custom hooks**: Extract reusable logic into custom hooks
- **Component naming**: `PascalCase` for component names
- **Props interface**: Define props interface for each component
- **Error boundaries**: Use error boundaries for error handling

### Code Style

- **Prettier**: Code formatting is handled by Prettier
- **ESLint**: Follow all ESLint rules
- **Imports**: Group imports (React, third-party, local)
- **Line length**: Maximum 100 characters per line
- **Semicolons**: Required
- **Quotes**: Single quotes for strings, double for JSX

### Example Component

```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onPress: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  const handlePress = () => {
    onPress(user.id);
  };

  return (
    <View onTouchEnd={handlePress}>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
    </View>
  );
};
```

## 🧪 Testing Guidelines

### Testing Pyramid

```
          ┌─────┐
         │ E2E  │      5%  - Critical user journeys
        └───┬───┘
       ┌────▼────┐
      │Integration│    15% - API & service integration
     └─────┬──────┘
    ┌──────▼───────┐
   │  Component    │   30% - UI component testing
  └────────┬────────┘
 ┌─────────▼─────────┐
 │    Unit Tests     │ 50% - Business logic, utilities
 └───────────────────┘
```

### Unit Tests

- **File naming**: `*.test.ts` or `*.spec.ts`
- **Test structure**: Arrange, Act, Assert (AAA)
- **Mock external dependencies**: Use mocks for API calls, database, etc.
- **Test edge cases**: Cover error conditions and boundary values

```typescript
// Example unit test
import { calculateTransactionFee } from '../utils/feeCalculator';

describe('calculateTransactionFee', () => {
  it('should calculate fee for amounts under 100', () => {
    const result = calculateTransactionFee(50);
    expect(result).toBe(2.5);
  });

  it('should calculate fee for amounts over 100', () => {
    const result = calculateTransactionFee(200);
    expect(result).toBe(10);
  });

  it('should throw error for negative amounts', () => {
    expect(() => calculateTransactionFee(-10)).toThrow('Invalid amount');
  });
});
```

### Component Tests

- **Testing Library**: Use React Native Testing Library
- **User-centric**: Test from user's perspective
- **Accessibility**: Test accessibility features
- **Mock navigation**: Mock React Navigation

```typescript
// Example component test
import { render, fireEvent } from '@testing-library/react-native';
import { TransactionItem } from '../TransactionItem';

describe('TransactionItem', () => {
  const mockTransaction = {
    id: '1',
    amount: 100,
    type: 'deposit' as const,
    timestamp: new Date(),
  };

  it('should display transaction amount', () => {
    const { getByText } = render(
      <TransactionItem transaction={mockTransaction} />
    );

    expect(getByText('GHS 100.00')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <TransactionItem
        transaction={mockTransaction}
        onPress={mockOnPress}
      />
    );

    fireEvent.press(getByTestId('transaction-item'));
    expect(mockOnPress).toHaveBeenCalledWith('1');
  });
});
```

### Integration Tests

- **API endpoints**: Test complete request/response cycles
- **Database operations**: Test data persistence and retrieval
- **External services**: Mock external API calls

### E2E Tests

- **Critical paths**: Test complete user journeys
- **Device compatibility**: Test on different devices/screen sizes
- **Network conditions**: Test offline/online scenarios

## 📝 Commit Conventions

We follow [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Scopes

- `mobile`: Mobile app changes
- `api`: Backend API changes
- `shared`: Shared packages changes
- `infra`: Infrastructure changes
- `docs`: Documentation changes

### Examples

```bash
feat(mobile): add biometric authentication flow
fix(api): resolve transaction sync race condition
docs: update API documentation for v2 endpoints
refactor(shared): extract common validation logic
test(mobile): add unit tests for transaction calculator
chore: update dependencies to latest versions
```

## 🔄 Pull Request Process

### PR Template

All PRs must include:

1. **Description**: Clear description of changes
2. **Related Issues**: Link to related issues
3. **WAI Reference**: Link to Write-Ahead Intent document
4. **Testing**: Description of testing performed
5. **Screenshots**: UI changes screenshots (if applicable)
6. **Breaking Changes**: List any breaking changes

### PR Checklist

- [ ] WAI document created and linked
- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Pre-commit hooks pass
- [ ] CI/CD checks pass
- [ ] Reviewed by at least one maintainer

### Review Process

1. **Automated Checks**: CI/CD must pass all checks
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer should test changes locally
4. **Approval**: PR approved by maintainer
5. **Merge**: Squash merge with conventional commit message

## 📚 Documentation

### Documentation Standards

- **README files**: Every package/workspace must have a README
- **API documentation**: OpenAPI/Swagger for API endpoints
- **Code comments**: JSDoc for complex functions
- **Inline comments**: Explain complex business logic

### Documentation Structure

```
docs/
├── Projects/           # Active development phases
├── Areas/              # Ongoing responsibilities
├── Resources/          # Reference materials
└── Archives/           # Completed work
```

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Step-by-step reproduction guide
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, device, app version
- **Screenshots**: If applicable
- **Logs**: Error logs or console output

### Feature Requests

For feature requests, please include:

- **Description**: Clear description of the feature
- **Use case**: Why this feature is needed
- **Alternatives**: Considered alternatives
- **Mockups**: UI mockups if applicable
- **Priority**: High/Medium/Low priority

### Security Issues

- **DO NOT** report security issues in public issues
- Email security@momomerchant.app with details
- Security issues will be handled with priority

## 🎯 Development Guidelines

### Performance

- **Bundle size**: Keep bundle size under 10MB
- **Startup time**: Target <3 seconds cold start
- **Memory usage**: Monitor and optimize memory usage
- **Battery impact**: Minimize battery drain

### Accessibility

- **Screen readers**: Support for TalkBack/VoiceOver
- **Color contrast**: WCAG AA compliance
- **Touch targets**: Minimum 44pt touch targets
- **Keyboard navigation**: Full keyboard support

### Internationalization

- **RTL support**: Support for right-to-left languages
- **Number formatting**: Locale-specific number formatting
- **Date formatting**: Locale-specific date formatting
- **Translation keys**: Use translation keys for all text

### Security

- **Input validation**: Validate all user inputs
- **Authentication**: Secure authentication flows
- **Data encryption**: Encrypt sensitive data at rest
- **API security**: Secure API communication

## 📞 Getting Help

- **Documentation**: Check [docs/](docs/) first
- **Issues**: Search existing [GitHub Issues](https://github.com/your-org/momo-merchant-app/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/your-org/momo-merchant-app/discussions) for questions
- **Slack**: Join our development Slack channel

## 🙏 Recognition

Contributors will be recognized in:
- **README.md**: Contributors section
- **Release notes**: Contributor mentions
- **Hall of Fame**: Top contributors recognition

Thank you for contributing to the MoMo Merchant Companion App! 🚀