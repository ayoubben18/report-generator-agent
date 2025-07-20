# Test Report with Mermaid Diagrams

This is a test document to verify that Mermaid diagrams render correctly in markdown.

## Chapter 1: System Architecture

### Overview

This chapter demonstrates various types of Mermaid diagrams integrated into a report.

### System Flow

Here's how our system processes data:

### Data Flow Diagram

```mermaid
%%{init: {'theme':'default'}}%%
flowchart TD
    A[User Input] --> B{Validate Data}
    B -->|Valid| C[Process Data]
    B -->|Invalid| D[Return Error]
    C --> E[Store in Database]
    E --> F[Generate Report]
    F --> G[Send to User]
```

*This diagram illustrates the main data processing flow in our system*

### Component Interaction

The following sequence diagram shows how components interact:

### API Interaction Sequence

```mermaid
%%{init: {'theme':'default'}}%%
sequenceDiagram
    participant U as User
    participant A as API Gateway
    participant S as Service
    participant D as Database
    
    U->>A: Send Request
    A->>S: Forward Request
    S->>D: Query Data
    D-->>S: Return Results
    S-->>A: Process Response
    A-->>U: Send Response
```

*Sequence of API calls in our microservices architecture*

### Database Schema

Our data model is structured as follows:

### Entity Relationship Diagram

```mermaid
%%{init: {'theme':'default'}}%%
erDiagram
    USER ||--o{ REPORT : creates
    USER {
        string id PK
        string name
        string email
        datetime created_at
    }
    REPORT ||--|{ CHAPTER : contains
    REPORT {
        string id PK
        string user_id FK
        string title
        datetime generated_at
    }
    CHAPTER ||--o{ DIAGRAM : includes
    CHAPTER {
        string id PK
        string report_id FK
        string title
        text content
        int order
    }
    DIAGRAM {
        string id PK
        string chapter_id FK
        string type
        text mermaid_code
        string position
    }
```

*Database schema for the report generation system*

## Chapter 2: Project Timeline

### Project Phases

Here's our development timeline:

### Development Gantt Chart

```mermaid
%%{init: {'theme':'default'}}%%
gantt
    title Report Generator Development Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Requirements Analysis     :done, req, 2024-01-01, 2024-01-15
    System Design            :done, design, 2024-01-15, 2024-02-01
    section Phase 2
    Core Development         :active, dev, 2024-02-01, 2024-03-15
    Diagram Integration      :active, diagram, 2024-03-01, 2024-03-20
    section Phase 3
    Testing                  :test, 2024-03-15, 2024-04-01
    Deployment              :deploy, 2024-04-01, 2024-04-15
```

*Project development timeline with key milestones*

### Feature Distribution

Current feature implementation status:

### Implementation Status

```mermaid
%%{init: {'theme':'default'}}%%
pie title Feature Implementation Status
    "Completed" : 45
    "In Progress" : 30
    "Planned" : 25
```

*Distribution of features across implementation stages*

## Chapter 3: Technical Analysis

### System States

The report generation workflow has several states:

### Workflow State Diagram

```mermaid
%%{init: {'theme':'default'}}%%
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start Generation
    Processing --> AnalyzingContent : Content Received
    AnalyzingContent --> GeneratingChapters : Analysis Complete
    GeneratingChapters --> GeneratingDiagrams : Chapters Ready
    GeneratingDiagrams --> AssemblingReport : Diagrams Complete
    AssemblingReport --> Complete : Assembly Done
    Complete --> [*]
    
    Processing --> Error : Validation Failed
    AnalyzingContent --> Error : Analysis Failed
    GeneratingChapters --> Error : Generation Failed
    Error --> Idle : Reset
```

*State transitions in the report generation workflow*

---

This test document demonstrates how Mermaid diagrams can be seamlessly integrated into markdown reports, providing visual clarity to complement textual content.