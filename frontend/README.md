# Smart Home Frontend

React-based web dashboard for monitoring and controlling smart home IoT devices.

## Features

- Real-time device monitoring via WebSocket
- Interactive charts and analytics with Recharts
- Material-UI components for modern design
- Responsive mobile-first layout
- Progressive Web App (PWA) support

## Prerequisites

- Node.js 16+ and npm
- Backend API running on port 5000

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update the environment variables as needed.

## Development

Start the development server:

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Building

Create a production build:

```bash
npm run build
```

The optimized files will be in the `build/` directory.

## Testing

Run the test suite:

```bash
npm test
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── services/      # API and WebSocket services
├── hooks/         # Custom React hooks
├── utils/         # Helper functions
└── App.jsx        # Main application component
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Technologies

- React 18
- React Router 6
- Material-UI 5
- Recharts 2
- Axios
- WebSocket API
