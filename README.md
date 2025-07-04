This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and configured with [Convex](https://convex.dev) for real-time data management and chat persistence.

> **Note:** This project previously used SST for deployment, but we've removed it to simplify the development process since we're not going to production yet. This allows developers to focus on building features without deployment complexity.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 18+
- pnpm (recommended package manager)
- A Convex account for database and real-time features
- [MiKTeX](https://miktex.org/download) (for PDF generation via LaTeX)

> **Note:** The PDF generation feature is only available in the development environment. This feature works via the `node-latex` package, which requires [MiKTeX](https://miktex.org/) installed on your machine. The **first PDF generation request** will be **slow**, and you may be **prompted to install LaTeX packages** during execution.

### Development

First, install dependencies:

```bash
pnpm install
```

Then, set up your Convex database and connect to it:

```bash
pnpm convex dev
```

This will:

- Connect your project to a Convex database
- Set up real-time data synchronization
- Enable chat persistence functionality

Finally, add the env vars from `env.template` and run the development server:

```bash
pnpm run dev
```
