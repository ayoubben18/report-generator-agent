This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and configured with [SST](https://sst.dev) for serverless deployment.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 18+
- pnpm (recommended package manager)
- AWS CLI configured with your credentials

### Development

First, install dependencies:

```bash
pnpm install
```

Then, run the development server with SST:

```bash
pnpm dev
```

This will:

1. Start the SST development environment
2. Deploy your infrastructure to AWS (if needed)
3. Start the Next.js development server
4. Set up live lambda development

Open the URL provided by SST (typically something like `https://xxxxxx.dev.sst.dev`) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

### Deploy to AWS

Deploy your application to AWS using SST:

```bash
# Deploy to staging
pnpm deploy --stage staging

# Deploy to production
pnpm deploy --stage production
```

### SST Commands

- `pnpm dev` - Start development environment
- `pnpm deploy` - Deploy to AWS
- `pnpm remove` - Remove deployed resources
- `pnpm console` - Open SST console to manage your app

### Environment Variables

Create a `.env.local` file (ignored by git) for your local environment variables:

```bash
NEXT_PUBLIC_APP_NAME=Report Generator Agent
NEXT_PUBLIC_STAGE=dev
# Add your other environment variables here
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [SST Documentation](https://sst.dev) - learn about SST and serverless deployment
- [AWS Documentation](https://docs.aws.amazon.com/) - learn about AWS services
