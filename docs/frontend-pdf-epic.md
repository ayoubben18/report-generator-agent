# Brownfield Epic: Frontend PDF Compilation from Markdown

## Epic Goal
Add client-side markdown-to-PDF generation as an alternative download option while maintaining the existing LaTeX-based PDF generation, giving users choice between high-quality LaTeX PDFs and quick browser-generated PDFs.

## Epic Description

**Existing System Context:**
- Current relevant functionality: LaTeX-based PDF generation infrastructure exists server-side using node-latex and MiKTeX
- Technology stack: Next.js, React, TypeScript, Convex for data, Mastra for AI orchestration
- Integration points: Report display component (`app/components/report-display.tsx`) currently has PDF download button (placeholder)

**Enhancement Details:**
- What's being added: Additional "Download as Markdown PDF" button for client-side PDF generation
- How it integrates: Add new button alongside existing PDF download button, keeping both options available
- Success criteria: Users can choose between LaTeX PDF (high quality) or Markdown PDF (instant, no server load)

## Stories

1. **Story 1: Research and Select Frontend PDF Library** - [View Story](./stories/frontend-pdf-story-1-research.md)
   - Evaluate client-side markdown-to-PDF libraries (markdown-pdf, jsPDF with markdown parser, pdfmake)
   - Consider performance, file size, markdown feature support, and styling capabilities
   - Create proof of concept comparing output quality with LaTeX version

2. **Story 2: Implement Dual PDF Download Options** - [View Story](./stories/frontend-pdf-story-2-implementation.md)
   - Add "Download as Markdown PDF" button next to existing "Download PDF" button
   - Implement client-side PDF generation using selected library
   - Maintain existing LaTeX PDF button functionality (implement server endpoint if needed)
   - Add tooltips explaining the difference (LaTeX: higher quality, slower; Markdown: instant, simpler)

3. **Story 3: Polish UI and Optimize User Experience** - [View Story](./stories/frontend-pdf-story-3-polish.md)
   - Style buttons to clearly differentiate options (icons, labels)
   - Add progress indicators for both PDF types
   - Handle edge cases (large reports, browser limitations)
   - Add user preference storage for default PDF type

## Compatibility Requirements
- [x] Existing APIs remain unchanged
- [x] Database schema changes are backward compatible (none needed)
- [x] UI changes follow existing patterns
- [x] Performance impact is minimal
- [x] Existing LaTeX PDF generation remains fully functional

## Risk Mitigation
- **Primary Risk:** User confusion with two PDF options
- **Mitigation:** Clear labeling and tooltips explaining differences
- **Rollback Plan:** Simply hide new button if issues arise

## Definition of Done
- [ ] All stories completed with acceptance criteria met
- [ ] Both PDF generation methods working correctly
- [ ] Clear UI differentiation between options
- [ ] Documentation updated to explain both options
- [ ] No regression in existing LaTeX PDF functionality

## Implementation Notes

### Key Benefits
- **For Users:** Choice between quality (LaTeX) and speed (Markdown)
- **For System:** Reduced server load for users who choose client-side generation
- **For Development:** Progressive enhancement - existing functionality preserved

### Technical Considerations
- Client-side library selection is critical (Story 1)
- Backend LaTeX endpoint needs implementation (currently placeholder)
- Memory constraints for large reports must be handled gracefully
- User education through UI is important for adoption

## Status Tracking

| Story | Status | Assignee | Notes |
|-------|--------|----------|-------|
| Story 1: Research | Draft | TBD | Ready for development |
| Story 2: Implementation | Draft | TBD | Depends on Story 1 |
| Story 3: Polish | Draft | TBD | Can start after Story 2 |

---

*Epic created: 2025-01-24*  
*Last updated: 2025-01-24*