// Simple entry point for the task
const { runTask } = require('./task-handler');

// Run the task
runTask()
    .then(() => {
        console.log("Task completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Task failed:", error);
        process.exit(1);
    }); 