package com.nammamedmate.server.infrastructure.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ComplianceRegisterPdfRenderer {

  public byte[] render(String title, List<String> columns, List<Map<String, String>> items) {
    Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    PdfWriter.getInstance(document, out);
    document.open();
    Font heading = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    Font cell = FontFactory.getFont(FontFactory.HELVETICA, 7);
    document.add(new Paragraph(title == null ? "Register" : title, heading));
    document.add(new Paragraph(" "));
    if (columns == null || columns.isEmpty()) {
      document.close();
      return out.toByteArray();
    }
    PdfPTable table = new PdfPTable(columns.size());
    table.setWidthPercentage(100);
    for (String column : columns) {
      PdfPCell header = new PdfPCell(new Phrase(column, heading));
      table.addCell(header);
    }
    for (Map<String, String> row : items) {
      for (String column : columns) {
        String value = row == null ? "" : row.getOrDefault(column, "");
        table.addCell(new PdfPCell(new Phrase(value == null ? "" : value, cell)));
      }
    }
    document.add(table);
    document.close();
    return out.toByteArray();
  }
}
