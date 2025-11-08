# Contributing to YDebug

Welcome to YDebug! This guide will help you set up your development environment and contribute to the project.

## Development Environment Setup

YDebug uses a containerized development environment for security isolation and consistent development experience across different platforms.

### Prerequisites

- Docker Desktop or Docker Engine + Docker Compose
- Git
- IDE with development container support (VS Code recommended)

### Quick Start with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/CPS-IT/ydebug.git
   cd ydebug
   ```

2. Start the development environment:
   ```bash
   npm run docker:dev
   ```

3. The container will:
   - Install dependencies automatically
   - Start the development server with hot reload
   - Expose port 3000 for the application
   - Expose port 9003 for Xdebug connections

### VS Code Development Container

For the best development experience with VS Code:

1. Install the "Dev Containers" extension
2. Open the project in VS Code
3. When prompted, click "Reopen in Container"
4. VS Code will build and start the development container automatically

The development container includes:
- Node.js v24 LTS
- All project dependencies
- Development tools (eslint, prettier, jest)
- Git integration
- Port forwarding for debugging

## Development Workflow

### Container-Based Development

All development happens inside Docker containers for security isolation:

```bash
# Start development environment
npm run docker:dev

# Stop development environment
npm run docker:stop

# Rebuild container (after dependency changes)
npm run docker:build
```

### Available Scripts

Inside the container or after connecting via development container:

```bash
# Development server with hot reload
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Run all validation (lint + format + tests)
npm run validate
```

### Code Quality

We maintain high code quality standards:

- **ESLint**: Enforces JavaScript best practices and coding standards
- **Prettier**: Ensures consistent code formatting
- **Jest**: Comprehensive test coverage required for all features
- **Pre-commit validation**: All code must pass linting and tests

Run `npm run validate` before committing to ensure your changes meet our standards.

## Architecture Overview

YDebug is structured as follows:

- `src/` - Main application source code
- `tests/` - Jest test files
- `config/` - Configuration files
- `documentation/` - Project documentation and ADRs
- `.devcontainer/` - VS Code development container configuration
- `docker-compose.yml` - Development environment orchestration

## Security Considerations

### Containerized Development

YDebug uses containerized development to protect against potentially malicious npm dependencies:

- **Isolation**: All dependencies run inside containers, isolated from your host system
- **Non-root execution**: Development container runs as non-root user
- **Network isolation**: Container has no external network access during development
- **Volume mounting**: Only source code is mounted, not sensitive host directories

### Local Communication Only

YDebug communicates locally with the Claude Code agent - no external API calls are made:

- **Local IPC**: Communication happens through local inter-process communication
- **No credentials**: No API keys or external authentication required
- **Privacy**: All debugging data stays on your local machine

## Xdebug Integration

For PHP debugging integration:

1. Ensure your PHP application has Xdebug configured
2. Set Xdebug to connect to `host.docker.internal:9003` (or your Docker host IP)
3. YDebug will listen on port 9003 for debugging connections

Example Xdebug configuration:
```ini
xdebug.mode=debug
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.start_with_request=yes
```

## Troubleshooting

### Common Development Issues

**Container won't start:**
- Ensure Docker is running
- Check if ports 3000 or 9003 are already in use
- Try `npm run docker:stop` then `npm run docker:dev`

**Dependency issues:**
- Delete `node_modules/` and restart container
- Rebuild container: `npm run docker:build`

**Xdebug not connecting:**
- Verify Xdebug configuration in your PHP application
- Check that port 9003 is properly exposed
- Ensure firewall isn't blocking the connection

**VS Code development container issues:**
- Ensure "Dev Containers" extension is installed
- Try "Dev Containers: Rebuild Container" from command palette
- Check Docker Desktop is running and accessible

### Getting Help

- Check existing [GitHub Issues](https://github.com/CPS-IT/ydebug/issues)
- Review [Architecture Decision Records](documentation/architecture/decisions/)
- Consult the [Project Documentation](documentation/)

## Contributing Guidelines

### Feature Development

1. Features are organized in `documentation/plan/feature/prototype/`
2. Each feature should be completable within hours
3. Follow the existing feature template and checklist format
4. Update documentation as you implement features

### Pull Request Process

1. Ensure your code passes all validation: `npm run validate`
2. Update relevant documentation
3. Add or update tests for new functionality
4. Follow conventional commit message format
5. Request review from maintainers

### Code Style

- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Write tests for new functionality

## Project Status

YDebug is currently in the prototype phase with features being implemented incrementally. See the [feature plan](documentation/plan/feature/prototype/) for current development progress.

## License

By contributing to YDebug, you agree that your contributions will be licensed under the GNU General Public License v3.0.

Thank you for contributing to YDebug!