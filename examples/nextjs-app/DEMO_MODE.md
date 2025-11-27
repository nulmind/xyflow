# Demo Mode - GitHub Pages Deployment

This guide explains how to run and deploy the Architecture Designer app in **Demo Mode**, which uses browser localStorage instead of a backend database, making it suitable for deployment on GitHub Pages or any static hosting.

## What is Demo Mode?

Demo Mode allows the app to run entirely in the browser without requiring:
- A backend server
- A database (SQLite/Prisma)
- Server-side API routes

Instead, it uses:
- **localStorage** for storing graph data locally in the browser
- **Client-side LLM calls** (optional) using user-provided OpenAI API key
- **Static HTML/CSS/JS** that can be deployed to GitHub Pages

## Features in Demo Mode

✅ **Fully functional graph editor** - Create and edit architecture diagrams
✅ **Local storage** - Data persists in your browser
✅ **AI-powered chat** - When you configure your OpenAI API key
✅ **No backend required** - Runs entirely client-side
✅ **GitHub Pages ready** - Deploy as a static site

## Quick Start (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Start in demo mode

```bash
# Copy demo environment config
cp .env.demo .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` - you'll see a "Demo Mode" banner at the top.

### 3. Configure AI features (optional)

Click the **Settings** button in the demo mode banner and enter your OpenAI API key. This enables the AI chat feature.

> **Note:** Your API key is stored only in your browser's localStorage and is never sent to any server except OpenAI's API.

## Deploying to GitHub Pages

### Method 1: Automatic Deployment with GitHub Actions

1. **Create `.github/workflows/deploy.yml`**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: ./examples/nextjs-app

      - name: Build for demo mode
        run: npm run build:demo
        working-directory: ./examples/nextjs-app

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./examples/nextjs-app/out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

3. **Push to main branch** - the workflow will automatically build and deploy

### Method 2: Manual Deployment

1. **Build the static site**:

```bash
npm run build:demo
```

This creates an `out/` directory with static files.

2. **Deploy the `out/` directory** to GitHub Pages:

```bash
# Install gh-pages package
npm install -g gh-pages

# Deploy
gh-pages -d out
```

### Method 3: Using a Subdirectory Path

If your GitHub Pages URL is `https://username.github.io/repo-name/`, update `.env.demo`:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_BASE_PATH=/repo-name
```

Then build and deploy:

```bash
npm run build:demo
```

## Configuration Options

### Environment Variables

Edit `.env.demo` or `.env.local`:

```env
# Enable demo mode
NEXT_PUBLIC_DEMO_MODE=true

# Base path for subdirectory deployment
NEXT_PUBLIC_BASE_PATH=/your-repo-name  # or empty for root domain
```

### Runtime Settings

Users can configure these in the browser (Settings button):

- **OpenAI API Key** - Required for AI chat features
- **Model** - Choose from GPT-4o, GPT-4o-mini, etc.
- **Base URL** - Custom API endpoint (for OpenAI-compatible APIs)

## Data Storage

### Where is data stored?

- **localStorage key**: `xyflow-architecture-graph`
- **Persists**: Until browser cache is cleared
- **Scope**: Per domain/origin

### Exporting/Importing Data

Currently, data is automatically saved to localStorage. To backup:

1. Open browser DevTools → Application/Storage → localStorage
2. Copy the value of `xyflow-architecture-graph`
3. Save to a file

To restore:
1. Paste the saved value back into localStorage
2. Refresh the page

### Clearing Data

```javascript
// In browser console
localStorage.removeItem('xyflow-architecture-graph')
```

Or use the Settings → Clear Settings option (this only clears API key, not graph data).

## Limitations

⚠️ **Demo mode limitations**:

1. **No backend** - All processing happens in the browser
2. **No collaboration** - Each user has their own local data
3. **No server-side validation** - Trust client-side code
4. **API key exposure** - Users must provide their own OpenAI API key
5. **Storage limits** - localStorage has ~5-10MB limit per domain
6. **No version history** - Only current state is saved

## Switching Between Modes

### From Demo Mode to Full Backend

1. Set up database:
   ```bash
   npm run db:push
   ```

2. Update `.env.local`:
   ```env
   NEXT_PUBLIC_DEMO_MODE=false
   DATABASE_URL="file:./dev.db"
   LLM_API_KEY=your-api-key
   ```

3. Restart:
   ```bash
   npm run dev
   ```

### From Backend to Demo Mode

1. Update `.env.local`:
   ```env
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. Restart:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Issue: "Please configure your OpenAI API key"

**Solution**: Click Settings button and enter your OpenAI API key.

### Issue: Data not persisting

**Solution**: Check if localStorage is enabled in your browser. Some privacy modes block localStorage.

### Issue: Build fails with database errors

**Solution**: Make sure `.env.demo` is copied to `.env.local` before building:
```bash
cp .env.demo .env.local
npm run build
```

### Issue: 404 errors on GitHub Pages

**Solution**: Ensure `NEXT_PUBLIC_BASE_PATH` matches your repository name if deploying to a subdirectory.

## Security Considerations

✅ **API keys are client-side only** - Stored in localStorage, never sent to your servers
⚠️ **Users manage their own keys** - They're responsible for API costs
✅ **No server-side secrets** - Everything is transparent in the browser
⚠️ **CORS restrictions** - Some APIs might not work from browser

## Support

For issues or questions:
- Check the main README.md
- Open an issue on GitHub
- Review the source code in `src/lib/demo-mode.ts`

## License

Same as the main project.
