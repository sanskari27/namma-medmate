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
import com.nammamedmate.server.application.hospital.HospitalWsInvoicePdfDocument;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class HospitalWsInvoicePdfRenderer {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final DateTimeFormatter IST_STAMP =
      DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(IST);
  private static final DecimalFormat MONEY = new DecimalFormat("0.00");

  public byte[] render(HospitalWsInvoicePdfDocument model) {
    Document document = new Document(PageSize.A4, 36, 36, 36, 36);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    PdfWriter.getInstance(document, out);
    document.open();
    Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
    Font body = FontFactory.getFont(FontFactory.HELVETICA, 9);
    document.add(new Paragraph(text(model.pharmacyName(), "Pharmacy"), title));
    document.add(new Paragraph("Pharmacy address: " + text(model.pharmacyAddress(), "—"), body));
    document.add(new Paragraph("Pharmacy GSTIN: " + text(model.pharmacyGstin(), "—"), body));
    document.add(new Paragraph("Drug licence: " + text(model.pharmacyDrugLicense(), "—"), body));
    document.add(new Paragraph("Bill to: " + text(model.hospitalName(), "Hospital"), title));
    document.add(new Paragraph("Hospital GSTIN: " + text(model.hospitalGstin(), "—"), body));
    document.add(new Paragraph("Invoice number: " + text(model.invoiceNumber(), "—"), body));
    document.add(
        new Paragraph(
            "Issued: " + (model.issuedAt() == null ? "—" : IST_STAMP.format(model.issuedAt())),
            body));
    document.add(new Paragraph("Ward: " + text(model.wardName(), "—"), body));
    document.add(new Paragraph("Reason: " + text(model.reason(), "—"), body));
    if (model.indentRef() != null && !model.indentRef().isBlank()) {
      document.add(new Paragraph("Indent: " + model.indentRef(), body));
    }
    if (model.uhid() != null && !model.uhid().isBlank()) {
      document.add(
          new Paragraph(
              "Patient: " + text(model.patientName(), "—") + " (" + model.uhid() + ")", body));
    }
    document.add(new Paragraph("Terms: " + text(model.creditTerms(), "—"), body));
    document.add(new Paragraph(" "));
    PdfPTable table =
        new PdfPTable(new float[] {2.4f, 1.2f, 1.1f, 1.0f, 0.8f, 0.8f, 1.1f, 1.1f, 0.8f, 1.1f});
    table.setWidthPercentage(100);
    header(table, "Medicine");
    header(table, "Batch");
    header(table, "Expiry");
    header(table, "HSN");
    header(table, "GST %");
    header(table, "Qty");
    header(table, "MRP");
    header(table, "Credit");
    header(table, "Disc %");
    header(table, "Amount");
    for (HospitalWsInvoicePdfDocument.Line line : model.lines()) {
      cell(table, text(line.productName(), "—"));
      cell(table, text(line.batchNumber(), "—"));
      cell(table, line.expiryOn() == null ? "—" : line.expiryOn().toString());
      cell(table, text(line.hsnCode(), "—"));
      cell(
          table,
          line.gstRate() == null ? "—" : line.gstRate().stripTrailingZeros().toPlainString());
      cell(table, qty(line.quantity()));
      cell(table, rupees(line.mrpPaise()));
      cell(table, rupees(line.creditPricePaise()));
      cell(table, disc(line.discountBps()));
      cell(table, rupees(line.amountPaise()));
    }
    document.add(table);
    document.add(new Paragraph(" "));
    document.add(new Paragraph("MRP value: " + rupees(model.mrpValuePaise()), body));
    document.add(new Paragraph("Billed to hospital: " + rupees(model.billedPaise()), body));
    document.add(new Paragraph("Terms: " + text(model.creditTerms(), "—"), body));
    document.add(new Paragraph("Authorised signatory", body));
    document.close();
    return out.toByteArray();
  }

  private static void header(PdfPTable table, String label) {
    PdfPCell cell =
        new PdfPCell(new Phrase(label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8)));
    table.addCell(cell);
  }

  private static void cell(PdfPTable table, String value) {
    table.addCell(new PdfPCell(new Phrase(value, FontFactory.getFont(FontFactory.HELVETICA, 8))));
  }

  private static String rupees(long paise) {
    return MONEY.format(paise / 100.0);
  }

  private static String disc(int bps) {
    return MONEY.format(bps / 100.0);
  }

  private static String qty(BigDecimal quantity) {
    if (quantity == null) {
      return "—";
    }
    return quantity.stripTrailingZeros().toPlainString();
  }

  private static String text(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value;
  }
}
