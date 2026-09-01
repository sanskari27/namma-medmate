import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function buildIdCardPdf(input: {
  shopName: string;
  fullName: string;
  position: string;
  employeeCode: string;
  city?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([243, 153]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 243, height: 153, color: rgb(0.97, 0.98, 0.99) });
  page.drawText(input.shopName, {
    x: 12,
    y: 128,
    size: 10,
    font: bold,
    color: rgb(0.1, 0.16, 0.23),
  });
  page.drawText(input.fullName, {
    x: 12,
    y: 88,
    size: 14,
    font: bold,
    color: rgb(0.1, 0.16, 0.23),
  });
  page.drawText(input.position, { x: 12, y: 68, size: 10, font, color: rgb(0.3, 0.35, 0.4) });
  page.drawText(input.employeeCode, { x: 12, y: 48, size: 10, font, color: rgb(0.3, 0.35, 0.4) });
  if (input.city) {
    page.drawText(input.city, { x: 12, y: 28, size: 9, font, color: rgb(0.4, 0.45, 0.5) });
  }
  return pdf.save({ useObjectStreams: false });
}
