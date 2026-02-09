# Changelog

All notable changes to the Smart Home project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and documentation
- Firmware scaffolding for ESP32 door control and sensor monitoring
- Backend FastAPI application framework
- React frontend dashboard foundation
- Docker Compose infrastructure setup
- TLS certificate generation scripts

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Mutual TLS authentication framework implemented

## [0.1.0] - 2026-02-09

### Added
- Project initialization
- Complete folder structure
- Documentation templates
- Development environment setup scripts
- CI/CD workflow configurations

---

## Version History Format

Each version should include sections as applicable:
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

## Versioning Guidelines

- **Major version** (X.0.0): Breaking changes, major architecture updates
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes, minor improvements

## Example Entry Format

```markdown
## [1.0.0] - 2026-XX-XX

### Added
- RFID access control system with sub-500ms response time
- Real-time temperature monitoring dashboard
- WebSocket-based live data streaming

### Changed
- Migrated from HTTP polling to WebSocket for sensor data
- Optimized Redis connection pooling

### Fixed
- Door lock occasionally failing to release on authorization
- Temperature graph flickering during rapid updates

### Security
- Implemented mutual TLS certificate pinning
- Added rate limiting to prevent DoS attacks
```
