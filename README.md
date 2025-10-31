# Skills Factory Backend API

Backend API for the Claude Skills Factory application. Automates creation of Claude Skills from raw content.

## Features

- Content analysis (copywriting, process, technical)
- Skill generation with Claude AI
- Skills library management
- ZIP file downloads
- SQLite database

## Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- Anthropic Claude API
- Handlebars templates
- JSZip for skill packaging

## Getting Started

### Prerequisites

- Node.js 18+
- Claude API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
CLAUDE_API_KEY=your-api-key
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/skills.db
```

### Run Development

```bash
npm run dev
```

### Run Production

```bash
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze content
- `POST /api/generate-skill` - Generate skill
- `GET /api/skills` - List all skills
- `GET /api/skills/:id` - Get skill by ID
- `GET /api/skills/:id/download` - Download skill ZIP

## Deployment

This backend is designed to deploy to Railway or Render.

Set environment variables in your hosting platform:
- `CLAUDE_API_KEY`
- `PORT` (default: 3001)
- `NODE_ENV=production`

## License

ISC


