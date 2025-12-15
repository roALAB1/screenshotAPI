# Screenshot API - AI-Powered Bug Capture Tool

A self-hosted debugging tool that captures screenshots, console logs, and network traffic with a single button click. Similar to Jam.dev, Highlight.io, and CaptureKit, but open-source and designed for internal team use.

## Features

### One-Click Bug Reporting
- **Screenshot Capture** - Captures the current state of the page
- **Console Logs** - Records all console output (log, warn, error, info, debug)
- **Network Traffic** - Captures all HTTP requests/responses in HAR format
- **User Actions** - Tracks clicks and interactions leading up to the bug

### Admin Dashboard
- View all bug reports with filtering and search
- Detailed view with console log viewer and network inspector
- Project management with unique API keys
- Integration guide with copy-paste code snippets

### Easy Integration
Just add a single script tag to your website:

```html
<script src="https://your-domain.com/sdk/bug-capture.js" 
        data-project-key="YOUR_PROJECT_KEY">
</script>
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Express + tRPC
- **Database**: MySQL/TiDB
- **Storage**: S3-compatible object storage

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- MySQL database
- S3-compatible storage

### Installation

1. Clone the repository:
```bash
git clone https://github.com/roALAB1/screenshotAPI.git
cd screenshotAPI
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (DATABASE_URL, S3 credentials, JWT_SECRET)

4. Run database migrations:
```bash
pnpm db:push
```

5. Start the development server:
```bash
pnpm dev
```

## SDK Usage

### Basic Integration

```html
<script src="https://your-domain.com/sdk/bug-capture.js" 
        data-project-key="YOUR_PROJECT_KEY"
        data-api-url="https://your-domain.com">
</script>
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `data-project-key` | Your project's unique API key | Required |
| `data-api-url` | URL of your Bug Capture API | Current origin |
| `data-position` | Button position (bottom-right, bottom-left, top-right, top-left) | bottom-right |
| `data-color` | Button color | #3b82f6 |

### Programmatic API

```javascript
// Trigger capture programmatically
window.BugCapture.capture();

// Capture with custom metadata
window.BugCapture.capture({
  metadata: {
    userId: 'user123',
    page: 'checkout',
    customField: 'value'
  }
});
```

## Architecture

The tool consists of three main components:

1. **Client SDK** - Lightweight JavaScript that captures browser state
2. **Backend API** - Receives and stores bug reports
3. **Admin Dashboard** - Web interface for viewing reports

### Capture Flow

```
User clicks "Report Bug"
        ↓
SDK captures screenshot, console logs, network traffic
        ↓
Data sent to API endpoint
        ↓
Stored in database + S3
        ↓
Available in admin dashboard
```

## Future Roadmap

- [ ] Session replay using rrweb
- [ ] AI-powered error analysis
- [ ] Slack/Discord notifications
- [ ] Export to HAR format
- [ ] Team collaboration features
- [ ] Browser extension

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.
