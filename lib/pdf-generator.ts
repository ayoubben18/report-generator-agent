import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportMetadata } from '@/types/workflow.types';

export async function generatePDF(
  fullReport: string,
  reportMetadata: ReportMetadata,
  filename: string
): Promise<void> {
  // Create a temporary container for the formatted content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.6';
  container.style.boxSizing = 'border-box';
  
  // Add the content to the container
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px; color: #1a1a1a;">
        ${reportMetadata.title}
      </h1>
      <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
        Generated on ${new Date(reportMetadata.generatedAt).toLocaleDateString()} at ${new Date(reportMetadata.generatedAt).toLocaleTimeString()}
      </div>
      <div style="display: flex; justify-content: center; gap: 20px; font-size: 12px; color: #888;">
        <span>${reportMetadata.chaptersCount} Chapters</span>
        <span>${reportMetadata.sectionsCount} Sections</span>
      </div>
    </div>
    <hr style="border: none; border-top: 2px solid #333; margin: 30px 0;">
    <div id="report-content">
      ${formatMarkdownForPDF(fullReport)}
    </div>
  `;

  // Add the container to the document
  document.body.appendChild(container);

  try {
    // Convert the container to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: container.scrollHeight,
    });

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add the first page
    pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

function formatMarkdownForPDF(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #2c3e50; border-left: 4px solid #3498db; padding-left: 15px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 22px; font-weight: bold; margin: 25px 0 15px 0; color: #1a1a1a; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 26px; font-weight: bold; margin: 30px 0 20px 0; color: #1a1a1a;">$1</h1>')
    
    // Horizontal rules
    .replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid #bdc3c7; margin: 20px 0;">')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
    
    // Italic text
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
    
    // Numbered lists
    .replace(/^(\d+\. .*$)/gim, '<li style="margin: 5px 0; padding-left: 10px;">$1</li>')
    
    // Bullet points
    .replace(/^[-*] (.*$)/gim, '<li style="margin: 5px 0; padding-left: 10px; list-style-type: disc;">$1</li>')
    
    // Wrap lists in ul/ol tags
    .replace(/(<li.*<\/li>)/g, '<ul style="margin: 10px 0; padding-left: 20px;">$1</ul>')
    
    // Paragraphs (non-empty lines that aren't already formatted)
    .replace(/^([^<].*)$/gim, '<p style="margin: 10px 0; text-align: justify;">$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p style="margin: 10px 0; text-align: justify;"><\/p>/g, '')
    
    // Add some spacing
    .replace(/<\/h[1-3]>/g, '</h$1><div style="margin-bottom: 10px;"></div>');
} 