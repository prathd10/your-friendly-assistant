import { jsPDF } from "jspdf";

/**
 * Generates and downloads a professional MOU PDF from raw text.
 * This utility handles pagination, text wrapping, and professional formatting.
 */
export const downloadMOUAsPDF = (content: string, eventName: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Header (Premium Style)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(40, 44, 52); // Dark slate
  doc.text("MEMORANDUM OF UNDERSTANDING", pageWidth / 2, 30, { align: "center" });

  // 2. Subheader / Event Name
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Muted slate
  doc.text(`Event Partnership Agreement: ${eventName || 'Official Campaign'}`, pageWidth / 2, 38, { align: "center" });

  // 3. Horizontal Line (Separator)
  doc.setDrawColor(226, 232, 240); // Soft border color
  doc.setLineWidth(0.5);
  doc.line(margin, 45, pageWidth - margin, 45);

  // 4. Body Content (Legal Text)
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59); // Deep text color

  // Clean the content (remove the internal tags and literal markdown bolding)
  const cleanContent = content
    .replace(/\[MOU_DOCUMENT_v1\]/g, '')
    .replace(/\[OFFICIAL MOU PDF\]/g, '')
    .replace(/\*\*/g, ''); // Strip all literal asterisks

  const rawLines = cleanContent.split('\n');
  let y = 55;

  rawLines.forEach((lineText: string) => {
    const trimmed = lineText.trim();
    if (!trimmed) {
      y += 4; // Extra space for empty lines
      return;
    }

    // Detect if the line is a header (all uppercase or ending with a colon)
    const isHeader = (trimmed.length > 3 && trimmed === trimmed.toUpperCase()) || trimmed.endsWith(':');

    if (isHeader) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // Darker for headers
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
    }

    const wrappedLines = doc.splitTextToSize(trimmed, contentWidth);
    
    wrappedLines.forEach((wrapped: string) => {
      // Check for page overflow
      if (y > pageHeight - margin - 15) {
        doc.addPage();
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`MOU - ${eventName} (Continued)`, margin, 15);
        y = 25; 
        // Re-set font for the content
        doc.setFont(isHeader ? "helvetica" : "helvetica", isHeader ? "bold" : "normal");
        doc.setFontSize(10.5);
      }
      doc.text(wrapped, margin, y);
      y += 6;
    });
  });

  // 5. Signature Footer Watermark
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} | Generated via EventSphere Official Discovery Engine | ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // 6. Download Execution
  const safeName = (eventName || 'MOU').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const filename = `${safeName}_Partnership_Agreement.pdf`;
  doc.save(filename);
};
