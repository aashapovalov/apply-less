interface GenerateCVPDFOptions {
  markdown: string;
  companyName: string;
  jobTitle: string;
}

export async function generateCVPDF({
  markdown,
  companyName,
  jobTitle,
}: GenerateCVPDFOptions): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  const lines = markdown.split('\n');
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Helper to render contact line with clickable links
  const renderContactLine = (text: string) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);

    // Split by | separator
    const parts = text.split('|').map((p) => p.trim());
    let x = margin;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Check if it's an email
      const emailMatch = part.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        const email = emailMatch[1];
        const textWidth = doc.getTextWidth(email);
        doc.setTextColor(0, 102, 204); // Blue color for links
        doc.textWithLink(email, x, y, { url: `mailto:${email}` });
        doc.setTextColor(0, 0, 0); // Reset to black
        x += textWidth;
      }
      // Check if it's a LinkedIn URL
      else if (part.includes('linkedin.com') || part.toLowerCase().includes('linkedin')) {
        const urlMatch = part.match(/(https?:\/\/)?((www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i);
        if (urlMatch) {
          const displayText = urlMatch[2]; // linkedin.com/in/username
          const fullUrl = urlMatch[1] ? part : `https://${urlMatch[2]}`;
          const textWidth = doc.getTextWidth(displayText);
          doc.setTextColor(0, 102, 204); // Blue color for links
          doc.textWithLink(displayText, x, y, { url: fullUrl });
          doc.setTextColor(0, 0, 0); // Reset to black
          x += textWidth;
        } else {
          // Just "LinkedIn" text without URL - still make it look like a link placeholder
          doc.setTextColor(0, 102, 204);
          doc.text(part, x, y);
          doc.setTextColor(0, 0, 0);
          x += doc.getTextWidth(part);
        }
      }
      // Regular text (location, phone)
      else {
        doc.text(part, x, y);
        x += doc.getTextWidth(part);
      }

      // Add separator except for last item
      if (i < parts.length - 1) {
        const separator = ' | ';
        doc.text(separator, x, y);
        x += doc.getTextWidth(separator);
      }
    }

    y += 5;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      y += 2;
      continue;
    }

    // # Name - 14pt bold
    if (trimmedLine.startsWith('# ')) {
      const text = trimmedLine.replace(/^# /, '');
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(text, margin, y);
      y += 6;
      continue;
    }

    // ## Position/Title - 12pt normal
    if (trimmedLine.startsWith('## ')) {
      const text = trimmedLine.replace(/^## /, '');
      checkPageBreak(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(text, margin, y);
      y += 5;
      continue;
    }

    // ### Section headers - 10pt bold uppercase with underline
    if (trimmedLine.startsWith('### ')) {
      const text = trimmedLine.replace(/^### /, '').toUpperCase();
      checkPageBreak(10);
      y += 4; // Extra space before section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(text, margin, y);
      y += 1;
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      continue;
    }

    // *italic text* - Contact line or other italic text
    if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && !trimmedLine.startsWith('**')) {
      const text = trimmedLine.slice(1, -1); // Remove * from both ends
      checkPageBreak(6);

      // Check if this looks like a contact line (contains | or @ or linkedin)
      if (text.includes('|') || text.includes('@') || text.toLowerCase().includes('linkedin')) {
        renderContactLine(text);
      } else {
        // Regular italic text
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        const wrappedLines = doc.splitTextToSize(text, maxWidth);
        for (const wrappedLine of wrappedLines) {
          checkPageBreak(5);
          doc.text(wrappedLine, margin, y);
          y += 4;
        }
      }
      continue;
    }

    // **bold text** (job titles, degrees) - 10pt bold
    if (trimmedLine.startsWith('**')) {
      const text = trimmedLine.replace(/\*\*/g, '');
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const wrappedLines = doc.splitTextToSize(text, maxWidth);
      for (const wrappedLine of wrappedLines) {
        checkPageBreak(5);
        doc.text(wrappedLine, margin, y);
        y += 4;
      }
      continue;
    }

    // Bullet points - 10pt normal with indent
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      const text = trimmedLine.replace(/^[-•] /, '');
      checkPageBreak(5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const bulletIndent = margin + 4;
      const bulletTextWidth = maxWidth - 4;

      // Add bullet
      doc.text('•', margin, y);

      // Handle inline bold in bullet text
      const cleanText = text.replace(/\*\*/g, '');
      const wrappedLines = doc.splitTextToSize(cleanText, bulletTextWidth);

      for (let i = 0; i < wrappedLines.length; i++) {
        checkPageBreak(5);
        doc.text(wrappedLines[i], bulletIndent, y);
        y += 4;
      }
      continue;
    }

    // Regular text - 10pt normal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Clean up any remaining markdown
    const cleanText = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');

    const wrappedLines = doc.splitTextToSize(cleanText, maxWidth);
    for (const wrappedLine of wrappedLines) {
      checkPageBreak(5);
      doc.text(wrappedLine, margin, y);
      y += 4;
    }
  }

  // Generate filename and save
  const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CV_${safeCompany}_${safeTitle}.pdf`);
}
