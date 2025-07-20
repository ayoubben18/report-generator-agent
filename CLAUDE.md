# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies (ALWAYS use pnpm)
pnpm install

# Start development server
pnpm dev

# Start Convex backend (required for real-time features)
pnpm convex dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Deploy via SST (currently disabled)
pnpm deploy
```

## High-Level Architecture

### Core Application Flow
This is an AI-powered report generator that follows this workflow:
1. User uploads documents and provides context
2. AI agent generates a report plan with chapters
3. User approves/modifies the plan (workflow suspension point)
4. Parallel chapter content generation using multiple AI providers
5. Final report assembly and PDF generation

### Key Architectural Patterns

**Real-time Architecture**: Uses Convex for real-time data synchronization and persistence
- Reports, workflows, and attachments are stored in Convex
- Real-time updates pushed to UI automatically

**AI Agent System**: Built on Mastra framework
- Orchestrates complex multi-step workflows
- Supports workflow suspension for user approval
- Integrates multiple LLM providers (Gemini, OpenAI)
- RAG implementation with Upstash Vector for document search

**State Management**:
- Server state: Convex (real-time sync)
- Local UI state: Zustand stores
- URL state: nuqs for search params
- Server cache: TanStack Query

**Component Architecture**:
- Next.js App Router for pages and API routes
- Shared UI components from shadcn/ui
- Page-specific components co-located with routes

### Environment Variables

Required environment variables (see `env.template`):
- `GEMINI_API_KEY` - Google Gemini API
- `OPENAI_API_KEY` - OpenAI API
- `EXA_API_KEY` - Exa search API
- `TAVILY_API_KEY` - Tavily search API
- `CONVEX_DEPLOYMENT` & `NEXT_PUBLIC_CONVEX_URL` - Convex setup
- `UPSTASH_VECTOR_REST_URL` & `UPSTASH_VECTOR_REST_TOKEN` - Vector DB

### Important Dependencies

**PDF Generation**: Requires MiKTeX installed locally for LaTeX-based PDF generation. First generation will be slow as LaTeX packages are installed.

### Key Implementation Details

**Report Generation Workflow** (`/task` directory):
- Uses Mastra agents for orchestration
- Workflow steps are resumable/suspendable
- Supports parallel execution of chapter generation
- MCP tools integration for enhanced capabilities

**Database Schema** (Convex):
- `reports`: Stores report metadata and content
- `workflows`: Tracks Mastra workflow execution state
- `attachments`: File metadata for uploaded documents

**File Processing**:
- PDF parsing with pdf-parse and pdfjs-dist
- Office documents with officeparser
- Vector embeddings stored in Upstash for RAG

### Development Guidelines

**MCP Server Usage** (from Cursor rules):
- Use Context7 for library/framework documentation
- Use Figma MCP for design analysis
- Use Tavily/Exa for web searches
- Use Sequential Thinking for complex planning

**Server Action Pattern**:
- All server actions return `ServerActionReturnType<T>`
- Client-side uses `handleServerAction()` wrapper
- Cache keys managed via `queryCacheKeys` object
- Consistent error handling throughout

**Component Conventions**:
- Follow existing patterns in the codebase
- Use Tailwind CSS v4 for styling
- Leverage shadcn/ui components
- Avoid adding comments unless requested