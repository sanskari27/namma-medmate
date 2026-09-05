package com.nammamedmate.server.infrastructure.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nammamedmate.server.application.sales.InvoicePdfDocument;
import com.nammamedmate.server.domain.InvoicePdfPolicy;
import com.nammamedmate.server.domain.PaymentMode;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class InvoiceA4PdfRenderer {

  private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
  private static final DateTimeFormatter IST_STAMP =
      DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(IST);
  private static final DecimalFormat MONEY = new DecimalFormat("0.00");

  public byte[] render(InvoicePdfDocument model) {
    Document document = new Document(PageSize.A4, 36, 36, 36, 36);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    PdfWriter.getInstance(document, out);
    document.open();
    Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
    Font body = FontFactory.getFont(FontFactory.HELVETICA, 9);
    Font small = FontFactory.getFont(FontFactory.HELVETICA, 8);
    document.add(new Paragraph(text(model.pharmacyLegalName(), "Pharmacy"), title));
    document.add(new Paragraph("Pharmacy address: " + text(model.pharmacyAddress(), "—"), body));
    document.add(
        new Paragraph("Pharmacy phone / contact: " + text(model.pharmacyPhone(), "—"), body));
    document.add(new Paragraph("GSTIN: " + text(model.pharmacyGstin(), "—"), body));
    document.add(new Paragraph("PAN: " + text(model.pharmacyPan(), "—"), body));
    document.add(
        new Paragraph(
            "Drug license number: " + text(model.pharmacyDrugLicenseNumber(), "—"), body));
    document.add(
        new Paragraph(
            "Drug license type / details: " + text(model.pharmacyDrugLicenseType(), "—"), body));
    document.add(new Paragraph("Invoice number: " + text(model.invoiceNumber(), "—"), body));
    document.add(
        new Paragraph(
            "Invoice date & time: "
                + (model.invoiceAt() == null ? "—" : IST_STAMP.format(model.invoiceAt())),
            body));
    document.add(new Paragraph("Customer name: " + text(model.customerName(), "Walk-in"), body));
    document.add(new Paragraph("Customer address: " + text(model.customerAddress(), "—"), body));
    document.add(new Paragraph("Customer GSTIN: " + text(model.customerGstin(), "—"), body));
    document.add(
        new Paragraph(
            "Prescription number / reference: " + text(model.prescriptionReference(), "—"), body));
    document.add(new Paragraph("Doctor name: " + text(model.doctorName(), "—"), body));
    document.add(
        new Paragraph(
            "Doctor registration number: " + text(model.doctorRegistration(), "—"), body));
    document.add(new Paragraph("Pharmacist name: " + text(model.pharmacistName(), "—"), body));
    document.add(
        new Paragraph(
            "Pharmacist registration number: " + text(model.pharmacistRegistration(), "—"), body));
    document.add(new Paragraph(" "));
    PdfPTable table =
        new PdfPTable(new float[] {3.2f, 1.4f, 1.2f, 0.8f, 0.8f, 1.1f, 1.1f, 1.1f, 1.1f, 0.9f});
    table.setWidthPercentage(100);
    header(table, "Product / medicine");
    header(table, "Batch");
    header(table, "Expiry");
    header(table, "Qty");
    header(table, "Unit");
    header(table, "MRP");
    header(table, "Sale price");
    header(table, "Discount");
    header(table, "HSN");
    header(table, "GST %");
    for (InvoicePdfDocument.Line line : model.lines()) {
      cell(table, text(line.productName(), "—"), small);
      cell(table, text(line.batchNumber(), "—"), small);
      cell(table, line.expiresOn() == null ? "—" : line.expiresOn().toString(), small);
      cell(table, quantity(line.quantity()), small);
      cell(table, line.unit() == null ? "—" : line.unit().name(), small);
      cell(table, rupees(line.mrpPaise()), small);
      cell(table, rupees(line.sellingPricePaise()), small);
      cell(table, rupees(line.discountPaise()), small);
      cell(table, text(line.hsnCode(), "—"), small);
      cell(
          table,
          line.gstRate() == null ? "—" : line.gstRate().stripTrailingZeros().toPlainString(),
          small);
      document.add(
          new Paragraph(
              "Product / medicine name: "
                  + text(line.productName(), "—")
                  + "  Batch number: "
                  + text(line.batchNumber(), "—")
                  + "  HSN code: "
                  + text(line.hsnCode(), "—"),
              body));
      if (line.scheduleClassification() != null || line.controlledSubstance()) {
        document.add(
            new Paragraph(
                "Schedule / controlled-drug information: "
                    + (line.scheduleClassification() == null
                        ? "controlled"
                        : line.scheduleClassification().name())
                    + (line.controlledSubstance() ? " controlled" : "")
                    + " — "
                    + text(line.productName(), "medicine"),
                body));
      }
      document.add(
          new Paragraph(
              "CGST amount: "
                  + rupees(line.cgstPaise())
                  + "  SGST amount: "
                  + rupees(line.sgstPaise())
                  + "  IGST amount: "
                  + rupees(line.igstPaise()),
              small));
    }
    document.add(table);
    document.add(new Paragraph("Total taxable value: " + rupees(model.taxablePaise()), body));
    document.add(new Paragraph("Total invoice value: " + rupees(model.totalPaise()), body));
    document.add(
        new Paragraph(
            "CGST amount: "
                + rupees(model.cgstPaise())
                + "  SGST amount: "
                + rupees(model.sgstPaise())
                + "  IGST amount: "
                + rupees(model.igstPaise()),
            body));
    String modes =
        model.payments().stream()
            .map(payment -> mode(payment.mode()) + " " + rupees(payment.amountPaise()))
            .collect(Collectors.joining(", "));
    document.add(new Paragraph("Payment mode: " + (modes.isBlank() ? "—" : modes), body));
    for (InvoicePdfDocument.ReturnNote note : model.returns()) {
      document.add(
          new Paragraph(
              "Return / refund: "
                  + text(note.reason(), "—")
                  + " "
                  + rupees(note.refundTotalPaise()),
              body));
    }
    document.add(
        new Paragraph(
            "Return / refund terms: Returned medicines are restocked to the originating batch when accepted. Refund is cash or a credit note on khata, as recorded on the return.",
            body));
    document.add(
        new Paragraph(
            "This is a computer-generated invoice. Pharmacist authentication is the printed name and registration number above.",
            body));
    if (!InvoicePdfPolicy.isA4(PageSize.A4.getWidth(), PageSize.A4.getHeight())) {
      throw new IllegalStateException("A4 page size required");
    }
    document.close();
    return out.toByteArray();
  }

  private static void header(PdfPTable table, String label) {
    PdfPCell cell =
        new PdfPCell(new Phrase(label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8)));
    cell.setHorizontalAlignment(Element.ALIGN_LEFT);
    table.addCell(cell);
  }

  private static void cell(PdfPTable table, String value, Font font) {
    table.addCell(new Phrase(value, font));
  }

  private static String rupees(long paise) {
    return MONEY.format(paise / 100.0);
  }

  private static String quantity(BigDecimal quantity) {
    if (quantity == null) {
      return "—";
    }
    return quantity.stripTrailingZeros().toPlainString();
  }

  private static String mode(PaymentMode mode) {
    return mode == null ? "—" : mode.name();
  }

  private static String text(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value;
  }
}
