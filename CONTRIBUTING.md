# Contributing to OSS Dashboard

Thank you for your interest in contributing to the OSS Dashboard project! This guide will help you get started.

## 🌟 Ways to Contribute

- **Report bugs**: Found a bug? Open an issue with details
- **Suggest features**: Have an idea? We'd love to hear it
- **Improve documentation**: Help make our docs clearer
- **Write code**: Fix bugs or implement new features
- **Add projects**: Suggest new open-source projects to track

## 🚀 Getting Started

### 1. Fork the Repository

1. Click the **Fork** button at the top right of this repository
2. Clone your fork to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/oss-dashboard.git
   cd oss-dashboard
   ```

### 2. Set Up Your Development Environment

Follow the instructions in [SETUP_GUIDE.md](SETUP_GUIDE.md) to:
- Get your GitHub token
- Install Python dependencies
- Run the data extraction script

### 3. Create a Branch

Create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

## 📝 Making Changes

### Code Style

**Python:**
- Follow PEP 8 style guide
- Use meaningful variable names
- Add docstrings to functions
- Keep functions focused and small

**JavaScript/React:**
- Use ES6+ syntax
- Follow Airbnb style guide
- Use functional components with hooks
- Add PropTypes or TypeScript types

**Java/Spring Boot:**
- Follow Java naming conventions
- Use Spring Boot best practices
- Add Javadoc comments
- Write unit tests

### Commit Messages

Write clear, descriptive commit messages:
```
feat: Add support for GitLab projects
fix: Resolve rate limiting issue in data extraction
docs: Update setup guide with troubleshooting steps
refactor: Simplify contributor data processing
```

Format: `type: description`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Testing

Before submitting:
- Test your changes locally
- Ensure existing functionality still works
- Add tests for new features
- Run the data extraction script to verify it works

## 🔄 Submitting Changes

### 1. Push Your Changes

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### 2. Create a Pull Request

1. Go to your fork on GitHub
2. Click **"Compare & pull request"**
3. Fill in the PR template:
   - **Title**: Clear, descriptive title
   - **Description**: What changes you made and why
   - **Related Issues**: Link any related issues
   - **Testing**: How you tested the changes

### 3. Code Review Process

- A maintainer will review your PR
- They may request changes or ask questions
- Make requested changes and push updates
- Once approved, your PR will be merged!

## 🐛 Reporting Bugs

When reporting bugs, include:
- **Description**: What happened vs. what you expected
- **Steps to reproduce**: How to recreate the bug
- **Environment**: OS, Python version, etc.
- **Error messages**: Full error output
- **Screenshots**: If applicable

## 💡 Suggesting Features

When suggesting features:
- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other approaches you considered
- **Additional context**: Mockups, examples, etc.

## 📋 Project-Specific Guidelines

### Adding New Projects to Track

To add a new open-source project:

1. Edit `data/projects.json`:
   ```json
   {
     "id": "project-name",
     "name": "Project Name",
     "github_org": "organization",
     "github_repo": "repository",
     "description": "Brief description",
     "category": "category-name"
   }
   ```

2. Run the data extraction script:
   ```bash
   cd scripts
   python extract_github_data.py
   ```

3. Verify the data was extracted correctly in `data/project-name/`

### Modifying Data Extraction

When modifying `extract_github_data.py`:
- Maintain backward compatibility with existing data
- Add error handling for API failures
- Include progress indicators for long operations
- Update documentation if adding new metrics

### Frontend Development

When working on the React dashboard:
- Use the existing component structure
- Follow the design system (colors, spacing, typography)
- Ensure responsive design (mobile, tablet, desktop)
- Add loading states and error handling

### Backend Development

When working on the Spring Boot API:
- Follow REST API best practices
- Add proper error handling and validation
- Write integration tests
- Document endpoints with Swagger/OpenAPI

## 🔒 Security

- **Never commit secrets**: GitHub tokens, API keys, passwords
- **Use environment variables**: For sensitive configuration
- **Report security issues privately**: Email maintainers directly

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them learn
- Accept constructive criticism gracefully
- Focus on what's best for the project

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Chat**: Join our community (link TBD)
- **Email**: Contact maintainers directly

## 🎉 Recognition

Contributors will be:
- Listed in the project README
- Credited in release notes
- Acknowledged in the dashboard (coming soon)

## 📚 Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Python PEP 8 Style Guide](https://www.python.org/dev/peps/pep-0008/)
- [React Best Practices](https://reactjs.org/docs/thinking-in-react.html)

---

**Thank you for contributing to OSS Dashboard!** 🚀

Every contribution, no matter how small, helps make this project better for everyone.