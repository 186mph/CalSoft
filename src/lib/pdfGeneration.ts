import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Interface for DOT inspection data
export interface DOTInspectionData {
  motorCarrierOperator: string;
  address: string;
  cityStateZip: string;
  inspectorName: string;
  reportNumber: string;
  fleetUnitNumber: string;
  date: string;
  vehicleType: 'TRACTOR' | 'TRAILER' | 'TRUCK' | 'OTHER';
  vehicleIdentification: string[];
  inspectorQualified: boolean;
  components: Record<string, {
    status?: 'OK' | 'NEEDS_REPAIR';
    repairedDate?: string;
  }>;
  additionalConditions: string;
  certified: boolean;
}

// Test function to verify PDF template loading
export async function testPDFTemplateLoading(): Promise<boolean> {
  try {
    console.log('Testing PDF template loading...');
    
    // Load the existing template PDF
    const templateUrl = '/dot-inspection-template.pdf';
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      console.error('Failed to load PDF template:', response.status, response.statusText);
      return false;
    }
    
    const templateBytes = await response.arrayBuffer();
    console.log('PDF template loaded successfully, size:', templateBytes.byteLength, 'bytes');
    
    // Try to load it with pdf-lib
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pageCount = pdfDoc.getPageCount();
    console.log('PDF loaded with pdf-lib, page count:', pageCount);
    
    if (pageCount > 0) {
      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();
      console.log('Page dimensions:', width, 'x', height, 'points');
      
      // Add a test text to verify we can write to the PDF
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText('TEST - PDF Template Working!', {
        x: 100,
        y: height - 100,
        size: 20,
        font: helveticaFont,
        color: rgb(1, 0, 0) // Red color to make it visible
      });
      
      // Save and download the test PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadPDF(blob, 'test-dot-template.pdf');
      
      console.log('Test PDF generated and downloaded successfully!');
      return true;
    } else {
      console.error('PDF has no pages');
      return false;
    }
    
  } catch (error) {
    console.error('Error testing PDF template loading:', error);
    return false;
  }
}

// Coordinate finder function - creates a PDF with numbered grid points
export async function generateCoordinateFinderPDF(): Promise<Blob> {
  try {
    console.log('Generating coordinate finder PDF...');
    
    // Load the existing template PDF
    const templateUrl = '/dot-inspection-template.pdf';
    const response = await fetch(templateUrl);
    if (!response.ok) throw new Error('Failed to load PDF template');
    
    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Draw a grid with coordinates every 50 points
    for (let x = 0; x <= width; x += 50) {
      for (let y = 0; y <= height; y += 50) {
        // Draw a small dot
        page.drawCircle({
          x: x,
          y: y,
          size: 2,
          color: rgb(1, 0, 0) // Red dot
        });
        
        // Add coordinate label
        page.drawText(`(${x},${y})`, {
          x: x + 5,
          y: y + 5,
          size: 8,
          font: helveticaFont,
          color: rgb(0, 0, 1) // Blue text
        });
      }
    }
    
    // Add instructions at the top
    page.drawText('COORDINATE FINDER - Click on the PDF to find exact coordinates', {
      x: 50,
      y: height - 50,
      size: 16,
      font: helveticaFont,
      color: rgb(1, 0, 0)
    });
    
    page.drawText('Red dots show coordinates every 50 points. Use these to map your form fields.', {
      x: 50,
      y: height - 70,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating coordinate finder PDF:', error);
    throw error;
  }
}

// Precision coordinate finder - places test text at specific field locations
export async function generatePrecisionCoordinateFinderPDF(): Promise<Blob> {
  try {
    console.log('Generating precision coordinate finder PDF...');
    
    // Load the existing template PDF
    const templateUrl = '/dot-inspection-template.pdf';
    const response = await fetch(templateUrl);
    if (!response.ok) throw new Error('Failed to load PDF template');
    
    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Test coordinates for key fields - we'll adjust these based on where they appear
    const testCoordinates = [
      // Header fields
      { text: 'MOTOR_CARRIER_OPERATOR', x: 100, y: 900, color: rgb(1, 0, 0) },
      { text: 'ADDRESS', x: 100, y: 850, color: rgb(1, 0, 0) },
      { text: 'CITY_STATE_ZIP', x: 100, y: 800, color: rgb(1, 0, 0) },
      { text: 'INSPECTOR_NAME', x: 450, y: 900, color: rgb(1, 0, 0) },
      { text: 'REPORT_NUMBER', x: 550, y: 950, color: rgb(1, 0, 0) },
      { text: 'FLEET_UNIT_NUMBER', x: 600, y: 900, color: rgb(1, 0, 0) },
      { text: 'DATE', x: 500, y: 900, color: rgb(1, 0, 0) },
      
      // Vehicle type checkboxes
      { text: 'TRACTOR_X', x: 150, y: 800, color: rgb(0, 1, 0) },
      { text: 'TRAILER_X', x: 200, y: 800, color: rgb(0, 1, 0) },
      { text: 'TRUCK_X', x: 250, y: 800, color: rgb(0, 1, 0) },
      { text: 'OTHER_X', x: 300, y: 800, color: rgb(0, 1, 0) },
      
      // Vehicle identification
      { text: 'LIC_PLATE_X', x: 550, y: 850, color: rgb(0, 0, 1) },
      { text: 'VIN_X', x: 600, y: 850, color: rgb(0, 0, 1) },
      { text: 'OTHER_ID_X', x: 650, y: 850, color: rgb(0, 0, 1) },
      
      // Inspector qualified
      { text: 'QUALIFIED_X', x: 450, y: 850, color: rgb(1, 0, 1) },
      
      // Test some inspection items
      { text: 'OK_1A', x: 150, y: 750, color: rgb(0, 1, 1) },
      { text: 'NEEDS_1A', x: 170, y: 750, color: rgb(0, 1, 1) },
      { text: 'DATE_1A', x: 190, y: 750, color: rgb(0, 1, 1) },
      
      { text: 'OK_4A', x: 350, y: 750, color: rgb(1, 1, 0) },
      { text: 'NEEDS_4A', x: 370, y: 750, color: rgb(1, 1, 0) },
      { text: 'DATE_4A', x: 390, y: 750, color: rgb(1, 1, 0) },
      
      { text: 'OK_9A', x: 550, y: 750, color: rgb(0.5, 0.5, 0.5) },
      { text: 'NEEDS_9A', x: 570, y: 750, color: rgb(0.5, 0.5, 0.5) },
      { text: 'DATE_9A', x: 590, y: 750, color: rgb(0.5, 0.5, 0.5) },
    ];
    
    // Draw test text at each coordinate
    testCoordinates.forEach(({ text, x, y, color }) => {
      page.drawText(text, {
        x: x,
        y: y,
        size: 10,
        font: helveticaFont,
        color: color
      });
    });
    
    // Add instructions
    page.drawText('PRECISION COORDINATE FINDER - Find where each colored text appears', {
      x: 50,
      y: height - 50,
      size: 16,
      font: helveticaFont,
      color: rgb(1, 0, 0)
    });
    
    page.drawText('Red=Headers, Green=Vehicle Type, Blue=Vehicle ID, Magenta=Qualified, Cyan=Left Column, Yellow=Middle Column, Gray=Right Column', {
      x: 50,
      y: height - 70,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error generating precision coordinate finder PDF:', error);
    throw error;
  }
}

// Coordinate map for headers, checkboxes, and dates (in points, y from bottom)
const DOT_PDF_COORDINATES = {
  // Header fields - exact coordinates from systematic list
  motorCarrierOperator: { x: 50, y: 750 },
  address: { x: 50, y: 730 },
  cityStateZip: { x: 50, y: 710 },
  inspectorName: { x: 250, y: 750 },
  reportNumber: { x: 450, y: 750 },
  fleetUnitNumber: { x: 450, y: 730 },
  date: { x: 450, y: 710 },

  // Vehicle type checkboxes ('X' positions)
  vehicleType: {
    tractor: { x: 50, y: 670 },
    trailer: { x: 130, y: 670 },
    truck: { x: 210, y: 670 },
    other: { x: 290, y: 670 }
  },

  // Vehicle identification checkboxes and value positions
  vehicleIdentification: {
    licPlate: { checkX: 50, y: 640, valueX: 100 },
    vin: { checkX: 250, y: 640, valueX: 300 },
    other: { checkX: 450, y: 640, valueX: 500 }
  },

  // Inspector qualified 'X'
  inspectorQualified: { x: 500, y: 610 },

  // Additional conditions
  additionalConditions: { x: 50, y: 100, maxWidth: 500 },

  // Certified 'X'
  certified: { x: 50, y: 70 },

  // Inspection components: map of 'section-item' to {okX, needsX, dateX, y}
  // Left column (Items 1-3)
  components: {
    // 1. BRAKE SYSTEM
    '0-0': { okX: 150, needsX: 180, dateX: 210, y: 530 },  // a. Service Brakes
    '0-1': { okX: 150, needsX: 180, dateX: 210, y: 510 },  // b. Parking Brake System
    '0-2': { okX: 150, needsX: 180, dateX: 210, y: 490 },  // c. Brake Drums or Rotors
    '0-3': { okX: 150, needsX: 180, dateX: 210, y: 470 },  // d. Brake Hose
    '0-4': { okX: 150, needsX: 180, dateX: 210, y: 450 },  // e. Brake Tubing
    '0-5': { okX: 150, needsX: 180, dateX: 210, y: 430 },  // f. Low Pressure Warning Device
    '0-6': { okX: 150, needsX: 180, dateX: 210, y: 410 },  // g. Tractor Protection Valve
    '0-7': { okX: 150, needsX: 180, dateX: 210, y: 390 },  // h. Air Compressor
    '0-8': { okX: 150, needsX: 180, dateX: 210, y: 370 },  // i. Electric Brakes
    '0-9': { okX: 150, needsX: 180, dateX: 210, y: 350 },  // j. Hydraulic Brakes
    '0-10': { okX: 150, needsX: 180, dateX: 210, y: 330 }, // k. Vacuum Systems

    // 2. COUPLING DEVICES
    '1-0': { okX: 150, needsX: 180, dateX: 210, y: 310 },  // a. Fifth Wheels
    '1-1': { okX: 150, needsX: 180, dateX: 210, y: 290 },  // b. Pintle Hooks
    '1-2': { okX: 150, needsX: 180, dateX: 210, y: 270 },  // c. Drawbar/Towbar Eye
    '1-3': { okX: 150, needsX: 180, dateX: 210, y: 250 },  // d. Drawbar/Towbar Tongue
    '1-4': { okX: 150, needsX: 180, dateX: 210, y: 230 },  // e. Safety Devices
    '1-5': { okX: 150, needsX: 180, dateX: 210, y: 210 },  // f. Saddle-Mounts

    // 3. EXHAUST SYSTEM
    '2-0': { okX: 150, needsX: 180, dateX: 210, y: 180 },  // a. Exhaust leak
    '2-1': { okX: 150, needsX: 180, dateX: 210, y: 150 },  // b. Bus exhaust violation
    '2-2': { okX: 150, needsX: 180, dateX: 210, y: 120 },  // c. Exhaust location

    // Middle column (Items 4-8)
    // 4. FUEL SYSTEM
    '3-0': { okX: 320, needsX: 350, dateX: 380, y: 530 },  // a. Visible leak
    '3-1': { okX: 320, needsX: 350, dateX: 380, y: 510 },  // b. Fuel tank filler cap missing
    '3-2': { okX: 320, needsX: 350, dateX: 380, y: 490 },  // c. Fuel tank securely attached

    // 5. LIGHTING DEVICES
    '4-0': { okX: 320, needsX: 350, dateX: 380, y: 470 },  // All lighting devices

    // 6. SAFE LOADING
    '5-0': { okX: 320, needsX: 350, dateX: 380, y: 440 },  // a. Falling parts/load
    '5-1': { okX: 320, needsX: 350, dateX: 380, y: 410 },  // b. Shifting cargo

    // 7. STEERING MECHANISM
    '6-0': { okX: 320, needsX: 350, dateX: 380, y: 390 },  // a. Steering Wheel Free Play
    '6-1': { okX: 320, needsX: 350, dateX: 380, y: 370 },  // b. Steering Column
    '6-2': { okX: 320, needsX: 350, dateX: 380, y: 350 },  // c. Front Axle Beam
    '6-3': { okX: 320, needsX: 350, dateX: 380, y: 330 },  // d. Steering Gear Box
    '6-4': { okX: 320, needsX: 350, dateX: 380, y: 310 },  // e. Pitman Arm
    '6-5': { okX: 320, needsX: 350, dateX: 380, y: 290 },  // f. Power Steering
    '6-6': { okX: 320, needsX: 350, dateX: 380, y: 270 },  // g. Ball and Socket Joints
    '6-7': { okX: 320, needsX: 350, dateX: 380, y: 250 },  // h. Tie Rods and Drag Links
    '6-8': { okX: 320, needsX: 350, dateX: 380, y: 230 },  // i. Nuts
    '6-9': { okX: 320, needsX: 350, dateX: 380, y: 210 },  // j. Steering System

    // 8. SUSPENSION
    '7-0': { okX: 320, needsX: 350, dateX: 380, y: 170 },  // a. U-bolts/spring hangers
    '7-1': { okX: 320, needsX: 350, dateX: 380, y: 140 },  // b. Spring Assembly
    '7-2': { okX: 320, needsX: 350, dateX: 380, y: 120 },  // c. Torque/Radius/Tracking

    // Right column (Items 9-13)
    // 9. FRAME
    '8-0': { okX: 490, needsX: 520, dateX: 550, y: 530 },  // a. Frame Members
    '8-1': { okX: 490, needsX: 520, dateX: 550, y: 510 },  // b. Tire and Wheel Clearance
    '8-2': { okX: 490, needsX: 520, dateX: 550, y: 490 },  // c. Adjustable Axle Assemblies

    // 10. TIRES
    '9-0': { okX: 490, needsX: 520, dateX: 550, y: 470 },  // a. Tires on steering axle
    '9-1': { okX: 490, needsX: 520, dateX: 550, y: 450 },  // b. All other tires

    // 11. WHEELS AND RIMS
    '10-0': { okX: 490, needsX: 520, dateX: 550, y: 430 }, // a. Lock or Side Ring
    '10-1': { okX: 490, needsX: 520, dateX: 550, y: 410 }, // b. Wheels and Rims
    '10-2': { okX: 490, needsX: 520, dateX: 550, y: 390 }, // c. Fasteners
    '10-3': { okX: 490, needsX: 520, dateX: 550, y: 370 }, // d. Welds

    // 12. WINDSHIELD GLAZING
    '11-0': { okX: 490, needsX: 520, dateX: 550, y: 340 }, // Requirements and exceptions

    // 13. WINDSHIELD WIPERS
    '12-0': { okX: 490, needsX: 520, dateX: 550, y: 310 }  // Inoperative wiper
  }
};

export async function generateDOTInspectionPDF(data: DOTInspectionData): Promise<Blob> {
  try {
    console.log('Generating DOT Inspection PDF with data:', data);
    
    // Load the existing template PDF
    const templateUrl = '/dot-inspection-template.pdf';  // Path to your "DOT Inspect.pdf"
    const response = await fetch(templateUrl);
    if (!response.ok) throw new Error('Failed to load PDF template');
    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('PDF form fields:', fields.map(f => f.getName()));
    console.log('Total form fields:', fields.length);
    
    // Log details about first few fields
    fields.slice(0, 5).forEach((field, index) => {
      console.log(`Field ${index}: "${field.getName()}" - Type: ${field.constructor.name}`);
    });

    // Fill form fields directly
    const fillField = (fieldName: string, value: string) => {
      try {
        const field = form.getField(fieldName);
        if (field) {
          console.log(`Filling field "${fieldName}" with value "${value}" (type: ${field.constructor.name})`);
          if (field.constructor.name === 'PDFTextField') {
            (field as any).setText(value);
            console.log(`Successfully set text for "${fieldName}"`);
          } else if (field.constructor.name === 'PDFCheckBox') {
            if (value === 'X') {
              (field as any).check();
              console.log(`Successfully checked "${fieldName}"`);
            } else {
              (field as any).uncheck();
              console.log(`Successfully unchecked "${fieldName}"`);
            }
          } else {
            console.log(`Unknown field type for "${fieldName}": ${field.constructor.name}`);
            // Try to set text anyway
            try {
              (field as any).setText(value);
              console.log(`Successfully set text for "${fieldName}" (fallback)`);
            } catch (fallbackError) {
              console.log(`Fallback failed for "${fieldName}":`, fallbackError);
            }
          }
        } else {
          console.log(`Field "${fieldName}" not found`);
        }
      } catch (error) {
        console.log(`Error filling field "${fieldName}":`, error);
      }
    };

    // Test with a simple field first
    console.log('Testing with DATE field...');
    fillField('DATE', 'TEST DATE');
    
    // Fill header fields using actual field names from PDF
    fillField('MOTOR CARRIER OPERATOR', data.motorCarrierOperator || '');
    fillField('ADDRESS', data.address || '');
    fillField('CITY STATE ZIP CODE', data.cityStateZip || '');
    fillField('INSPECTORS NAME PRINT OR TYPE', data.inspectorName || '');
    fillField('REPORT NUMBERRow1', data.reportNumber || '');
    fillField('FLEET UNIT NUMBERRow1', data.fleetUnitNumber || '');
    fillField('DATE', data.date || '');

    // Fill vehicle type checkboxes - this appears to be a single field with options
    if (data.vehicleType) {
      fillField('VEHICLE TYPE TRACTOR TRAILER TRUCK OTHER', data.vehicleType);
    }

    // Fill vehicle identification - this appears to be a single field
    if (data.vehicleIdentification && data.vehicleIdentification.length > 0) {
      const vehicleIdText = data.vehicleIdentification.filter(id => id).join(' ');
      fillField('VEHICLE IDENTIFICATION   AND COMPLETE LIC PLATE NO VIN OTHER', vehicleIdText);
    }

    // Fill inspector qualified
    if (data.inspectorQualified) {
      fillField('YES', 'X');
    }

    // Fill inspection components using the actual field names
    // The PDF has fields like 'OKRow1', 'NEEDS REPAIRRow1', 'REPAIRED DATERow1'
    Object.entries(data.components).forEach(([key, component]) => {
      if (component) {
        // Map our component keys to the PDF row numbers
        const rowMapping: { [key: string]: number } = {
          '0-0': 1, '0-1': 2, '0-2': 3, '0-3': 4, '0-4': 5, '0-5': 6, '0-6': 7, '0-7': 8, '0-8': 9, '0-9': 10, '0-10': 11,
          '1-0': 12, '1-1': 13, '1-2': 14, '1-3': 15, '1-4': 16, '1-5': 17,
          '2-0': 18, '2-1': 19, '2-2': 20,
          '3-0': 21, '3-1': 22, '3-2': 23,
          '4-0': 24,
          '5-0': 25, '5-1': 26,
          '6-0': 27, '6-1': 28, '6-2': 29, '6-3': 30, '6-4': 31, '6-5': 32, '6-6': 33, '6-7': 34, '6-8': 35, '6-9': 36,
          '7-0': 37, '7-1': 38, '7-2': 39,
          '8-0': 40, '8-1': 41, '8-2': 42,
          '9-0': 43, '9-1': 44,
          '10-0': 45, '10-1': 46, '10-2': 47, '10-3': 48,
          '11-0': 49,
          '12-0': 50
        };
        
        const rowNumber = rowMapping[key];
        if (rowNumber) {
          if (component.status === 'OK') {
            fillField(`OKRow${rowNumber}`, 'X');
          } else if (component.status === 'NEEDS_REPAIR') {
            fillField(`NEEDS REPAIRRow${rowNumber}`, 'X');
          }
          if (component.repairedDate) {
            fillField(`REPAIRED DATERow${rowNumber}`, component.repairedDate);
          }
        }
      }
    });

    // Fill additional conditions - need to find the correct field name
    // Looking at the field list, I don't see a clear "Additional Conditions" field
    // We might need to identify the correct field name for this

    console.log('PDF generation completed successfully');
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating DOT Inspection PDF:', error);
    throw error;
  }
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}