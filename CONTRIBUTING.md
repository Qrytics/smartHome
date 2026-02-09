# Contributing to Smart Home Project

Thank you for your interest in contributing to the Smart Home capstone project! This document provides guidelines for setting up your development environment and contributing code.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Code Style Guidelines](#code-style-guidelines)
3. [Commit Message Conventions](#commit-message-conventions)
4. [Pull Request Process](#pull-request-process)
5. [Testing Requirements](#testing-requirements)

## Development Environment Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** - Backend development
- **Node.js 18+** - Frontend development
- **PlatformIO** - Firmware development
- **Docker & Docker Compose** - Infrastructure services
- **Git** - Version control

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Qrytics/smartHome.git
cd smartHome

# Run the automated setup script
./scripts/setup-dev-env.sh
```

This script will:
- Set up Python virtual environment
- Install backend dependencies
- Install frontend dependencies
- Configure PlatformIO
- Start Docker services (Redis, TimescaleDB)

### Manual Setup

If you prefer manual setup, refer to [docs/SETUP.md](docs/SETUP.md) for detailed instructions.

## Code Style Guidelines

### Python (Backend)

We follow PEP 8 with some modifications:

- **Line length**: 100 characters maximum
- **Imports**: Use `isort` for organizing imports
- **Formatting**: Use `black` for automatic formatting
- **Type hints**: Required for all function signatures

```python
# Good example
def authorize_access(card_uid: str, device_id: str) -> bool:
    """Check if card is authorized for device access.
    
    Args:
        card_uid: RFID card unique identifier
        device_id: Target device identifier
        
    Returns:
        True if access granted, False otherwise
    """
    pass
```

**Linting commands:**
```bash
cd backend
black app/
flake8 app/
mypy app/
```

### JavaScript/React (Frontend)

- **Style**: ESLint with Airbnb configuration
- **Formatting**: Prettier
- **Component naming**: PascalCase for components, camelCase for files
- **Hooks**: Use custom hooks for reusable logic

```jsx
// Good example
import React, { useState, useEffect } from 'react';

const TemperatureGraph = ({ sensorId }) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Fetch data
  }, [sensorId]);
  
  return <div>{/* Render graph */}</div>;
};

export default TemperatureGraph;
```

**Linting commands:**
```bash
cd frontend
npm run lint
npm run format
```

### C++ (Firmware)

- **Standard**: C++11 minimum
- **Naming**: 
  - Classes: PascalCase (e.g., `RfidHandler`)
  - Functions: camelCase (e.g., `readCardUid()`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Comments**: Doxygen-style for public functions

```cpp
// Good example
class RfidHandler {
public:
    /**
     * @brief Read RFID card UID
     * @return Card UID as string, empty if no card detected
     */
    String readCardUid();
    
private:
    static const int MAX_RETRY_COUNT = 3;
    bool initialized_;
};
```

## Commit Message Conventions

We follow the Conventional Commits specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(backend): add access control authorization endpoint

Implement POST /api/access/check endpoint that validates RFID cards
against the whitelist stored in Redis. Returns authorization decision
within 50ms target latency.

Closes #42
```

```
fix(firmware): prevent solenoid lock from sticking

Add flyback diode protection circuit and reduce PWM duty cycle
to prevent electromagnetic interference causing lock to stick.

Fixes #38
```

### Scope Guidelines

- `backend`: FastAPI backend changes
- `frontend`: React dashboard changes
- `firmware`: ESP32 firmware changes
- `docs`: Documentation updates
- `infra`: Infrastructure configuration
- `ci`: CI/CD pipeline changes

## Pull Request Process

### Before Opening a PR

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend && pytest
   
   # Frontend tests
   cd frontend && npm test
   
   # Firmware compilation
   cd firmware/door-control && pio run
   ```

4. **Lint your code**
   ```bash
   ./scripts/run-tests.sh lint
   ```

### Opening the PR

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues using "Closes #XX" or "Fixes #XX"
   - Add screenshots for UI changes

3. **PR Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests pass (CI must be green)
   - [ ] Documentation updated
   - [ ] No merge conflicts
   - [ ] Commits are atomic and well-described

### Review Process

- At least one approval required from project maintainers
- Address review feedback promptly
- Keep discussions focused and professional
- Update PR description if scope changes

## Testing Requirements

### Backend

- **Unit tests**: All service layer functions
- **Integration tests**: API endpoints
- **Coverage**: Minimum 80% for new code

```bash
cd backend
pytest --cov=app tests/
```

### Frontend

- **Component tests**: React Testing Library
- **Integration tests**: Key user flows
- **Coverage**: Minimum 70% for new code

```bash
cd frontend
npm test -- --coverage
```

### Firmware

- **Unit tests**: PlatformIO native testing
- **Hardware tests**: Document manual testing procedures

```bash
cd firmware/door-control
pio test
```

## Questions?

- Open an issue for bug reports or feature requests
- Use discussions for questions and ideas
- Contact team members: See [README.md](README.md#team-members)

Thank you for contributing! 🚀
