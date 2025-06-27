# Mastra AI Agent with MCP Integration

This task contains a Mastra AI agent configured with Google Gemini and MCP-like tools for report generation.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```bash
# Google Gemini API Key
# Get your API key from: https://ai.google.dev/gemini-api/docs/api-key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here

# App Configuration
NEXT_PUBLIC_APP_NAME=Report Generator Agent
NEXT_PUBLIC_STAGE=dev

# SST Configuration
SST_STAGE=dev
```

### 3. Get Google Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
2. Create a new project or select an existing one
3. Enable the Gemini API
4. Create an API key
5. Add it to your `.env.local` file

## Deployment

### Development

```bash
pnpm dev
```

This will start both the Next.js app and deploy the Mastra agent function to AWS.

### Production

```bash
pnpm deploy --stage production
```

## Usage

Once deployed, you can interact with the agent via HTTP POST requests:

```bash
curl -X POST https://your-function-url.lambda-url.region.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate a report about quarterly sales performance",
    "agentId": "reportAgent"
  }'
```

## Agent Capabilities

The Report Generator Agent can:

1. **Read Files**: Access and read files from the file system
2. **Generate Reports**: Create structured reports in various formats (markdown, text, structured JSON)
3. **Analyze Data**: Process and analyze provided data
4. **MCP Integration**: Use Model Context Protocol for external tool access

## Tools Available

- `readFile`: Read content from file system
- `generateReport`: Generate structured reports with metadata

## Agent Configuration

The agent is configured with:

- **Model**: Google Gemini 1.5 Flash
- **Instructions**: Specialized for report generation and data analysis
- **Tools**: File system access and report generation capabilities
- **Memory**: Conversation memory for context retention

## File Structure

```
task/
├── mastra-agent.ts    # Main Mastra configuration and agent definition
├── handler.ts         # AWS Lambda handler for HTTP requests
└── README.md          # This documentation
```
