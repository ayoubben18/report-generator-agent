# AGENTS.md - Development Guide for AI Coding Agents

## Build/Lint/Test Commands
- **Package Manager**: ALWAYS use `pnpm` (never npm)
- **Development**: `pnpm dev` (requires `pnpm convex dev` for backend)
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **No test framework configured** - check with user before adding tests

## Code Style & Conventions
- **TypeScript**: Strict mode enabled, use proper types
- **Imports**: Use `@/` path alias for project root imports
- **Components**: Export from barrel files (`index.ts`) in shared directories
- **Styling**: Tailwind CSS v4, use `cn()` utility from `@/lib/utils`
- **Error Handling**: Try-catch with descriptive error messages, log with emoji prefixes (❌ for errors)

## Server Actions Pattern (Critical)
- **Return Type**: All server actions must return `Promise<ServerActionReturnType<T>>`
- **Client Usage**: Wrap calls with `handleServerAction()` from `@/utils`
- **Cache Keys**: Use centralized `queryCacheKeys` object for TanStack Query
- **Validation**: Use Zod schemas for input validation

## MCP Server Usage (From Cursor Rules)
- **Context7**: Library/framework documentation (`bunx @upstash/context7-mcp@latest`)
- **Tavily**: General web search (`npx tavily-mcp@0.1.3`)
- **Exa**: Academic/company research, GitHub repos, LinkedIn profiles
- **Sequential Thinking**: Complex planning (`npx @modelcontextprotocol/server-sequential-thinking`)
- **Figma**: Design analysis when Figma URLs provided

## Architecture Notes
- **Database**: Convex for real-time data (reports, workflows, attachments)
- **AI Framework**: Mastra for agent orchestration with workflow suspension
- **State**: Zustand stores for local state, nuqs for URL params
- **PDF Generation**: LaTeX-based (requires MiKTeX locally)