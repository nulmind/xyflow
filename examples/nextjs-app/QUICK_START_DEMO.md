# Quick Start - Demo Mode

Deploy the Architecture Designer as a static site to GitHub Pages in minutes!

## What You Get

- ✅ **No backend required** - Runs entirely in the browser
- ✅ **Free hosting** - Deploy to GitHub Pages for free
- ✅ **Local storage** - Data saved in browser localStorage
- ✅ **Optional AI** - Users can add their own OpenAI API key for chat features

## Quick Deploy to GitHub Pages

### Option 1: Using GitHub Actions (Recommended)

1. **Fork or clone this repository**

2. **Create `.github/workflows/deploy-demo.yml`** in your repository root:

```yaml
name: Deploy Demo to GitHub Pages

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
    defaults:
      run:
        working-directory: ./examples/nextjs-app

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build packages
        run: pnpm build
        working-directory: .

      - name: Build demo
        run: cp .env.demo .env.local && pnpm build

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

3. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

4. **Push to main branch** - Your site will automatically deploy!

### Option 2: Manual Deployment

```bash
# 1. Install dependencies
pnpm install

# 2. Build in demo mode
cd examples/nextjs-app
cp .env.demo .env.local
pnpm build

# 3. Deploy the 'out' directory
# You can use gh-pages, Netlify, Vercel, or any static host
```

## Local Testing

```bash
# Install dependencies
pnpm install

# Navigate to app
cd examples/nextjs-app

# Enable demo mode
cp .env.demo .env.local

# Start dev server
pnpm dev
```

Visit `http://localhost:3000` - you should see a "Demo Mode" banner!

## Configuring AI Features

Once deployed:

1. Click the **⚙️ Settings** button in the demo mode banner
2. Enter your OpenAI API key
3. Choose your preferred model (GPT-4o, GPT-4o-mini, etc.)
4. Click **Save**

Your API key is stored **only in your browser** and never sent anywhere except OpenAI.

## For GitHub Pages Subdirectory

If deploying to `https://username.github.io/repo-name/`, edit `.env.demo`:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_BASE_PATH=/repo-name
```

## Troubleshooting

**Problem**: Blank page or 404 errors
- **Solution**: Check `NEXT_PUBLIC_BASE_PATH` matches your deployment URL

**Problem**: "Please configure your OpenAI API key"
- **Solution**: Click Settings and add your API key

**Problem**: Data not saving
- **Solution**: Check if localStorage is enabled in your browser (some privacy modes block it)

## Learn More

See [DEMO_MODE.md](./DEMO_MODE.md) for complete documentation.

## Support

- [xyflow Documentation](https://reactflow.dev)
- [GitHub Issues](https://github.com/xyflow/xyflow/issues)
