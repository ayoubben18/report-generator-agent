# Story: Research and Select Frontend PDF Library

<!-- Source: Brownfield Epic - Frontend PDF Compilation from Markdown -->
<!-- Context: Brownfield enhancement to report-generator-agent -->

## Status: Done

## Story

**As a** report user,  
**I want** the development team to research and select the best client-side PDF generation library,  
**so that** we can implement browser-based PDF generation with optimal quality and performance.

## Context Source

- Source Document: Brownfield Epic - Frontend PDF Compilation from Markdown
- Enhancement Type: Research and technical decision
- Existing System Impact: No direct impact - research phase only

## Acceptance Criteria

1. At least 3 client-side PDF libraries are evaluated (e.g., jsPDF, pdfmake, react-pdf, markdown-pdf)
2. Each library is assessed for:
   - Markdown parsing capabilities
   - Styling and formatting support
   - Performance with large documents
   - Bundle size impact
   - Browser compatibility
   - Active maintenance status
3. A proof of concept is created with the top candidate showing:
   - Basic markdown to PDF conversion
   - Handling of report structure (headers, lists, code blocks)
   - Comparison with LaTeX output quality
4. Decision is documented with clear rationale
5. Selected library integrates well with Next.js/React ecosystem

## Dev Technical Guidance

### Existing System Context

- Current tech stack: Next.js 15.3.4, React, TypeScript
- Existing PDF generation: Server-side LaTeX using `LaTeXService` in `/lib/latex-generator.ts`
- Report display component: `/app/components/report-display.tsx`
- Markdown rendering: Currently using `react-markdown` with `remark-gfm` and `rehype-highlight`

### Integration Approach

- Library should work alongside existing `react-markdown` setup
- Must be compatible with Next.js client-side rendering
- Should not conflict with existing server-side LaTeX generation

### Technical Constraints

- Must work in browser environment (no Node.js dependencies)
- Should handle reports up to ~100 pages without crashing
- Bundle size impact should be reasonable (<500KB ideally)
- Must support modern browsers (Chrome, Firefox, Safari, Edge)

## Tasks / Subtasks

- [ ] Task 1: Research and evaluate PDF libraries (AC: 1, 2)

  - [ ] Create evaluation matrix with criteria
  - [ ] Test jsPDF with markdown parsing
  - [ ] Test pdfmake with structured document approach
  - [ ] Test react-pdf or similar React-specific solutions
  - [ ] Evaluate bundle sizes and performance metrics

- [ ] Task 2: Create proof of concept (AC: 3)

  - [ ] Set up test environment in project
  - [ ] Implement basic markdown to PDF conversion
  - [ ] Test with sample report content including:
    - Headers and subheaders
    - Lists (ordered and unordered)
    - Code blocks with syntax highlighting
    - Links and emphasis
  - [ ] Generate side-by-side comparison with LaTeX output

- [ ] Task 3: Document findings and recommendation (AC: 4, 5)
  - [ ] Create comparison table of evaluated libraries
  - [ ] Document pros/cons of each option
  - [ ] Provide clear recommendation with rationale
  - [ ] Include code snippets showing integration approach

## Risk Assessment

### Implementation Risks

- **Primary Risk**: Selected library may not handle complex markdown features well
- **Mitigation**: Thorough testing with real report content during POC
- **Verification**: Compare output quality with existing LaTeX PDFs

### Rollback Plan

- This is research only - no production code changes
- POC code can be isolated in a branch

### Safety Checks

- [x] No changes to existing functionality
- [x] Research can be conducted in isolation
- [x] POC won't affect production code

## Dev Notes

### Testing Approach

- Use existing report samples from the application
- Test with both small (5-10 page) and large (50+ page) reports
- Pay special attention to:
  - Memory usage during generation
  - Generation time
  - Output file size
  - Visual quality

### Key Files to Reference

- `/app/components/report-display.tsx` - Current report display implementation
- `/lib/latex-generator.ts` - Existing LaTeX conversion logic (for feature parity reference)
- Current markdown rendering setup uses `react-markdown` with plugins

### Success Metrics

- Library can handle all markdown features currently in use
- PDF generation completes in <5 seconds for typical reports
- Output quality is acceptable (even if not as polished as LaTeX)
- Integration requires minimal changes to existing code

## Change Log

| Date       | Version | Description            | Author   |
| ---------- | ------- | ---------------------- | -------- |
| 2025-01-24 | 1.0     | Initial story creation | SM Agent |
| 2025-01-24 | 2.0     | Story completed        | Dev Agent |

## Dev Agent Record

### Agent Model Used
Claude Code Dev Agent

### Completion Notes
- Evaluated 3 PDF libraries: jsPDF, pdfmake, and @react-pdf/renderer
- Created comprehensive test environment at `/app/pdf-test/page.tsx`
- Built proof of concept with pdfmake at `/app/pdf-test/proof-of-concept.tsx`
- Recommendation: **pdfmake** selected for best balance of features and performance

### File List
- Created: `/app/pdf-test/page.tsx` - Test environment for all libraries
- Created: `/app/pdf-test/proof-of-concept.tsx` - Working proof of concept
- Created: `/lib/markdown-pdf-generator.ts` - PDF generation utility class
- Created: `/docs/research/pdf-libraries/evaluation-matrix.md` - Initial evaluation
- Created: `/docs/research/pdf-libraries/test-results.md` - Detailed test results
- Created: `/docs/research/pdf-libraries/recommendation.md` - Final recommendation
- Modified: `package.json` - Added jspdf, pdfmake, markdown-it, html2canvas, @react-pdf/renderer

### Key Findings
1. **jsPDF**: Produces image-based PDFs (not recommended)
2. **pdfmake**: Best overall choice - vector PDFs, good performance, reasonable bundle size
3. **@react-pdf/renderer**: Good quality but larger bundle and more complex setup

### Next Steps
- Proceed to Story 2: Implement dual PDF download options using pdfmake
