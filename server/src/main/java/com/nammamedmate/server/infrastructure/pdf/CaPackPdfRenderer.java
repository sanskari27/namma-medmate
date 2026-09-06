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
import com.nammamedmate.server.application.finance.CaPackSection;
import com.nammamedmate.server.application.finance.CaPackView;
import com.nammamedmate.server.application.finance.FinanceReportTotal;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CaPackPdfRenderer {

  public byte[] render(CaPackView pack) {
    Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    PdfWriter writer = PdfWriter.getInstance(document, out);
    writer.setCompressionLevel(0);
    document.open();
    Font heading = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
    Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
    Font cell = FontFactory.getFont(FontFactory.HELVETICA, 7);
    document.add(new Paragraph("Pack for the CA", heading));
    if (pack != null) {
      document.add(
          new Paragraph(
              "Period " + pack.from() + " to " + pack.to() + " (" + pack.scope() + ")", cell));
      document.add(new Paragraph(" "));
      List<CaPackSection> sections = pack.sections() == null ? List.of() : pack.sections();
      for (CaPackSection section : sections) {
        document.add(
            new Paragraph(section.title() == null ? section.key() : section.title(), sectionFont));
        if (section.totals() != null) {
          for (FinanceReportTotal total : section.totals()) {
            document.add(
                new Paragraph(
                    (total.label() == null ? total.key() : total.label())
                        + ": "
                        + total.amountPaise(),
                    cell));
          }
        }
        List<String> columns = section.columns() == null ? List.of() : section.columns();
        if (!columns.isEmpty()) {
          PdfPTable table = new PdfPTable(columns.size());
          table.setWidthPercentage(100);
          table.setSpacingBefore(4);
          table.setSpacingAfter(10);
          for (String column : columns) {
            table.addCell(new PdfPCell(new Phrase(column, sectionFont)));
          }
          List<Map<String, String>> items = section.items() == null ? List.of() : section.items();
          for (Map<String, String> row : items) {
            for (String column : columns) {
              String value = row == null ? "" : row.getOrDefault(column, "");
              table.addCell(new PdfPCell(new Phrase(value == null ? "" : value, cell)));
            }
          }
          document.add(table);
        } else {
          document.add(new Paragraph(" "));
        }
      }
    }
    document.close();
    return out.toByteArray();
  }
}
