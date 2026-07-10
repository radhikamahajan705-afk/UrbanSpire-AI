const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a municipal certificate PDF and saves it to /uploads/certificates.
 * Returns the relative file path to store in the Certificate document.
 */
const generateCertificatePDF = (certificate) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `${certificate.certificateId}.pdf`;
      const dir = path.join(__dirname, '..', 'uploads', 'certificates');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .fillColor('#10203D')
        .text('UrbanSpire AI', { align: 'center' })
        .fontSize(11)
        .fillColor('#5B6472')
        .text('Municipal Corporation — Digital Certificate', { align: 'center' })
        .moveDown(1.5);

      doc
        .strokeColor('#C89B3C')
        .lineWidth(1.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Title
      doc
        .fontSize(16)
        .fillColor('#10203D')
        .text(certificate.type.toUpperCase(), { align: 'center' })
        .moveDown(1.5);

      // Details table
      const details = [
        ['Certificate ID', certificate.certificateId],
        ['Applicant Name', certificate.applicantName],
        ['ID / Reference Number', certificate.idNumber],
        ['Mobile Number', certificate.mobile],
        ['Status', certificate.status],
        ['Issued Date', certificate.issuedDate ? new Date(certificate.issuedDate).toDateString() : 'Pending Approval'],
      ];

      details.forEach(([label, value]) => {
        doc
          .fontSize(11)
          .fillColor('#5B6472')
          .text(`${label}:`, 50, doc.y, { continued: true, width: 200 })
          .fillColor('#10203D')
          .text(`  ${value}`);
        doc.moveDown(0.4);
      });

      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('#9FA6B2')
        .text(
          'This is a digitally generated certificate issued by UrbanSpire AI Municipal Platform. ' +
            'For verification, please cross-check the Certificate ID on the citizen portal.',
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

module.exports = { generateCertificatePDF };
