/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "report-generator-agent",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
            providers: {
                aws: {
                    region: "eu-west-3",
                    profile: "personal"
                }
            }
        };
    },
    async run() {
        const GEMINI_API_KEY = new sst.Secret("GEMINI_API_KEY");

        const secrets = [GEMINI_API_KEY]
        const bus = new sst.aws.Bus("ReportGeneratorBus");

        // Create VPC and Cluster for Tasks
        const vpc = new sst.aws.Vpc("ReportGeneratorVpc", { nat: "ec2" });
        const cluster = new sst.aws.Cluster("ReportGeneratorCluster", { vpc });

        // Mastra AI Agent Task
        const mastraTask = new sst.aws.Task("MastraTask", {
            cluster,
            link: secrets,
            image: {
                context: ".",
                dockerfile: "Dockerfile",
            },
            dev: {
                command: "npx tsx task/task-handler.ts",
            },
            cpu: "0.5 vCPU",
            memory: "1 GB",
        });

        // Lambda function to handle bus events and invoke the task
        const taskInvoker = new sst.aws.Function("TaskInvoker", {
            handler: "task/lambda-handler.handler",
            link: [mastraTask, ...secrets],
        });

        // Subscribe the Lambda to the bus
        bus.subscribe("GenerateReport", taskInvoker.arn);

        // Next.js app
        new sst.aws.Nextjs("ReportGeneratorApp", {
            link: [bus, ...secrets],
            server: {
                memory: "1 GB",
                timeout: "1 minute"
            },
        });

    },
});
