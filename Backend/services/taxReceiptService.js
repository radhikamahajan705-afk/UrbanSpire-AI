const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateTaxReceiptPDF = (payment, tax) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `${payment.receiptId}.pdf`;
      const dir = path.join(__dirname, '..', 'uploads', 'certificates');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc
        .fontSize(20).fillColor('#10203D').text('UrbanSpire AI', { align: 'center' })
        .fontSize(11).fillColor('#5B6472').text('Municipal Corporation — Property Tax Receipt', { align: 'center' })
        .moveDown(1.5);

      doc.strokeColor('#C89B3C').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

      doc.fontSize(16).fillColor('#10203D').text('PAYMENT RECEIPT', { align: 'center' }).moveDown(1.5);

      const rows = [
        ['Receipt ID', payment.receiptId],
        ['Property ID', payment.propertyId],
        ['Owner Name', payment.ownerName],
        ['Financial Year', tax.financialYear],
        ['Amount Paid', `Rs. ${payment.amountPaid.toLocaleString('en-IN')}`],
        ['Payment Method', payment.paymentMethod],
        ['Transaction Ref', payment.transactionRef],
        ['Paid On', new Date(payment.paidAt).toDateString()],
      ];
      rows.forEach(([label, value]) => {
        doc.fontSize(11).fillColor('#5B6472').text(`${label}:`, 50, doc.y, { continued: true, width: 200 })
          .fillColor('#10203D').text(`  ${value}`);
        doc.moveDown(0.4);
      });

      doc.moveDown(2);
      doc.fontSize(9).fillColor('#9FA6B2').text(
        'This is a digitally generated receipt from a demo/mock payment gateway for UrbanSpire AI. Not valid as an official government tax receipt in production without a live payment integration.',
        { align: 'center' }
      );

      doc.end();
      stream.on('finish', () => resolve(`/uploads/certificates/${fileName}`));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateTaxReceiptPDF };
