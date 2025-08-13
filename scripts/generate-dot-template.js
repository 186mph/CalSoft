import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDOTTemplate() {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // 8.5" x 11" in points
    const { width, height } = page.getSize();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Helper function to draw text
    const drawText = (text, x, y, fontSize = 10, font = helveticaFont) => {
      page.drawText(text, {
        x,
        y: height - y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
    };
    
    // Helper function to draw checkbox
    const drawCheckbox = (x, y, label = '') => {
      // Draw checkbox border
      page.drawRectangle({
        x,
        y: height - y - 12,
        width: 12,
        height: 12,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0)
      });
      
      // Draw label if provided
      if (label) {
        drawText(label, x + 20, y + 10, 10, helveticaFont);
      }
    };
    
    // Helper function to draw text field
    const drawTextField = (x, y, width, label = '') => {
      // Draw field border
      page.drawRectangle({
        x,
        y: height - y - 20,
        width,
        height: 20,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0)
      });
      
      // Draw label if provided
      if (label) {
        drawText(label, x, y + 25, 10, helveticaBold);
      }
    };
    
    // Draw title
    drawText('ANNUAL VEHICLE INSPECTION REPORT', width / 2 - 150, 50, 14, helveticaBold);
    
    // Draw header section
    drawTextField(100, 720, 200, 'MOTOR CARRIER OPERATOR');
    drawTextField(100, 690, 200, 'ADDRESS');
    drawTextField(100, 660, 200, 'CITY, STATE, ZIP CODE');
    drawTextField(350, 690, 200, 'INSPECTOR\'S NAME (PRINT OR TYPE)');
    
    // Draw vehicle history section
    page.drawRectangle({
      x: 500,
      y: height - 750,
      width: 100,
      height: 80,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0)
    });
    drawText('VEHICLE HISTORY', 520, 750, 10, helveticaBold);
    drawTextField(500, 720, 100, 'REPORT NUMBER');
    drawTextField(500, 690, 100, 'FLEET UNIT NUMBER');
    drawTextField(500, 660, 100, 'DATE');
    
    // Draw vehicle type section
    drawText('VEHICLE TYPE', 100, 620, 10, helveticaBold);
    drawCheckbox(100, 600, 'TRACTOR');
    drawCheckbox(180, 600, 'TRAILER');
    drawCheckbox(260, 600, 'TRUCK');
    drawCheckbox(340, 600, '(OTHER)');
    
    // Draw vehicle identification section
    drawText('VEHICLE IDENTIFICATION', 100, 570, 10, helveticaBold);
    drawCheckbox(100, 550, 'LIC. PLATE NO.');
    drawCheckbox(220, 550, 'VIN');
    drawCheckbox(340, 550, 'OTHER');
    
    // Draw inspector qualification
    drawText('THIS INSPECTOR MEETS THE QUALIFICATION REQUIREMENTS IN SECTION 396.19.', 100, 520, 10, helveticaFont);
    drawCheckbox(500, 520, 'YES');
    
    // Draw instructions
    drawText('INSTRUCTIONS: MARK COLUMN ENTRIES TO VERIFY INSPECTION: X OK, X NEEDS REPAIR, NA IF ITEMS DO NOT APPLY, ______ REPAIRED DATE', 100, 480, 9, helveticaFont);
    
    // Draw inspection table header
    drawText('VEHICLE COMPONENTS INSPECTED', 100, 450, 12, helveticaBold);
    
    // Draw table headers
    drawText('COMPONENT', 100, 420, 10, helveticaBold);
    drawText('OK', 400, 420, 10, helveticaBold);
    drawText('NEEDS REPAIR', 450, 420, 10, helveticaBold);
    drawText('REPAIRED DATE', 500, 420, 10, helveticaBold);
    
    // Draw table borders
    page.drawRectangle({
      x: 100,
      y: height - 440,
      width: 500,
      height: 300,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0)
    });
    
    // Draw vertical lines for columns
    page.drawLine({
      start: { x: 380, y: height - 440 },
      end: { x: 380, y: height - 140 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    page.drawLine({
      start: { x: 430, y: height - 440 },
      end: { x: 430, y: height - 140 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    page.drawLine({
      start: { x: 480, y: height - 440 },
      end: { x: 480, y: height - 140 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    // Draw horizontal lines for rows (simplified)
    for (let i = 0; i < 15; i++) {
      const y = height - 440 - (i * 20);
      page.drawLine({
        start: { x: 100, y },
        end: { x: 600, y },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
    }
    
    // Draw some sample component items
    const components = [
      '1. BRAKE SYSTEM',
      'a. Service Brakes',
      'b. Parking Brake System',
      'c. Brake Drums or Rotors',
      '2. COUPLING DEVICES',
      'a. Fifth Wheels',
      'b. Pintle Hooks',
      '3. EXHAUST SYSTEM',
      'a. Any exhaust system determined to be leaking...',
      '4. FUEL SYSTEM',
      'a. Visible leak',
      'b. Fuel tank filler cap missing',
      '5. LIGHTING DEVICES',
      'All lighting devices and reflectors required by Section 393 shall be operable.'
    ];
    
    let currentY = 400;
    components.forEach((component, index) => {
      drawText(component, 110, currentY, 9, helveticaFont);
      currentY -= 20;
    });
    
    // Draw additional conditions section
    drawText('List any other condition which may prevent safe operation of this vehicle', 100, 200, 10, helveticaBold);
    page.drawRectangle({
      x: 100,
      y: height - 220,
      width: 500,
      height: 60,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0)
    });
    
    // Draw certification section
    drawText('CERTIFICATION: THIS VEHICLE HAS PASSED ALL THE INSPECTION ITEMS FOR THE ANNUAL VEHICLE INSPECTION REPORT IN ACCORDANCE WITH 49 CFR 396.', 100, 140, 10, helveticaFont);
    drawCheckbox(100, 120);
    
    // Draw footer
    drawText('© Copyright 1994 & Published by J. J. KELLER & ASSOCIATES, INC. Neenah, WI 54857-0368 PRINTED IN THE U.S.A.', 100, 80, 8, helveticaFont);
    drawText('200-FB-C3 Rev. 3/94', 500, 80, 8, helveticaFont);
    drawText('ORIGINAL', width / 2 - 30, 60, 10, helveticaBold);
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Write to file
    const outputPath = path.join(__dirname, '../public/dot-inspection-template.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log('DOT Inspection template PDF generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error generating DOT template:', error);
  }
}

generateDOTTemplate();
