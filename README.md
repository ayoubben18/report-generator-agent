## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 18+
- pnpm (recommended package manager)
- A Convex account for database and real-time features

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
