# Contributing to Munim MetalKit

Thank you for your interest in contributing to Munim MetalKit! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows a code of conduct that we expect all contributors to follow. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- React Native development environment
- iOS development: Xcode 14+
- Android development: Android Studio
- Web development: Modern browser

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/munim-metalkit.git
cd munim-metalkit

# Install dependencies
npm install

# Install example app dependencies
cd example
npm install
cd ..
```

### Building

```bash
# Build the package
npm run build

# Build example app
cd example
npm run build
```

### Running Tests

```bash
# Run unit tests
npm test

# Run example app
cd example
npm start
```

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

1. **Bug Fixes**: Fix issues in existing code
2. **Feature Additions**: Add new functionality
3. **Performance Improvements**: Optimize existing code
4. **Documentation**: Improve or add documentation
5. **Examples**: Add example code or tutorials
6. **Platform Support**: Improve cross-platform compatibility

### Before You Start

1. Check existing issues and pull requests
2. Discuss major changes in an issue first
3. Ensure your changes align with the project goals
4. Consider backward compatibility

## Pull Request Process

### Before Submitting

1. **Test your changes** on all supported platforms (iOS, Android, Web)
2. **Update documentation** if you've added new features
3. **Add tests** for new functionality
4. **Follow coding standards** (see below)
5. **Update changelog** if applicable

### Pull Request Template

When creating a pull request, please include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested on Web
- [ ] Added unit tests
- [ ] Updated example app

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Changelog updated
```

### Review Process

1. All pull requests require review
2. At least one maintainer must approve
3. All CI checks must pass
4. Code must follow project standards

## Issue Reporting

### Before Creating an Issue

1. Search existing issues
2. Check if it's already fixed
3. Gather relevant information

### Issue Template

```markdown
## Bug Report / Feature Request

### Description

Clear description of the issue or feature request

### Platform

- [ ] iOS
- [ ] Android
- [ ] Web

### Environment

- React Native version:
- Munim MetalKit version:
- Device/OS version:

### Steps to Reproduce (for bugs)

1. Step one
2. Step two
3. Step three

### Expected Behavior

What should happen

### Actual Behavior

What actually happens

### Additional Context

Any other relevant information
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use const/let instead of var
- Prefer arrow functions for callbacks

### Swift (iOS)

- Follow Swift style guidelines
- Use meaningful names
- Add documentation comments
- Handle errors appropriately
- Use guard statements for early returns

### Kotlin (Android)

- Follow Kotlin style guidelines
- Use meaningful names
- Add KDoc comments
- Handle exceptions properly
- Use null safety features

### General

- Write clear, readable code
- Add comments for complex logic
- Use consistent formatting
- Follow platform conventions
- Optimize for performance

## Testing

### Unit Tests

- Write tests for new functionality
- Maintain high test coverage
- Test edge cases and error conditions
- Use descriptive test names

### Integration Tests

- Test cross-platform functionality
- Test with different configurations
- Test performance characteristics
- Test error handling

### Manual Testing

- Test on real devices
- Test on different screen sizes
- Test with different data sets
- Test error scenarios

## Documentation

### Code Documentation

- Document all public APIs
- Use JSDoc for TypeScript
- Use Swift documentation for iOS
- Use KDoc for Android
- Include usage examples

### User Documentation

- Update README for new features
- Add examples for new APIs
- Update changelog
- Consider adding tutorials

### API Documentation

- Document all parameters
- Document return values
- Document exceptions/errors
- Include code examples

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update version numbers
2. Update changelog
3. Update documentation
4. Run all tests
5. Test on all platforms
6. Create release notes
7. Tag release
8. Publish to npm

## Community

### Getting Help

- Check documentation first
- Search existing issues
- Ask questions in discussions
- Join our community chat

### Providing Help

- Answer questions in issues
- Help with pull request reviews
- Improve documentation
- Share examples and tutorials

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Thank You

Thank you for contributing to Munim MetalKit! Your contributions help make this project better for everyone.
