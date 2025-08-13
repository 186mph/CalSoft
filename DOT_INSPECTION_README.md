# DOT Inspection PDF Generation System

This system allows users to fill out a DOT Inspection form digitally and generate a filled PDF based on their input. The output PDF is based on the standard Annual Vehicle Inspection Report form from J.J. Keller & Associates, compliant with 49 CFR 396.

## Features

- **Digital Form Interface**: Complete web-based form matching the DOT inspection requirements
- **PDF Generation**: Automatically generates filled PDFs using the actual DOT inspection template
- **Data Validation**: Ensures all required fields are properly filled
- **Professional Output**: PDFs look identical to the original DOT inspection form
- **Download Ready**: Generated PDFs are immediately downloadable and printable

## System Architecture

### Core Components

1. **PDF Generation Library** (`src/lib/pdfGeneration.ts`)
   - Handles loading the DOT inspection template
   - Maps user data to PDF coordinates
   - Generates filled PDFs using pdf-lib

2. **DOT Inspection Form** (`src/components/DOTInspectionForm.tsx`)
   - Complete React form component
   - Handles all user input and validation
   - Integrates with PDF generation

3. **PDF Template** (`public/dot-inspection-template.pdf`)
   - Base DOT inspection form template
   - Generated using the template generation script

### Key Features

- **Template-Based Approach**: Uses the actual DOT inspection form as a base
- **Precise Coordinate Mapping**: Hardcoded coordinates for accurate field placement
- **Font Consistency**: Uses standard fonts (Helvetica) for professional appearance
- **Checkbox Handling**: Properly draws "X" marks in checkboxes
- **Date Formatting**: Formats dates in mm/dd/yyyy format
- **Error Handling**: Comprehensive error handling and user feedback

## Installation & Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- React application

### Installation

1. Install required dependencies:
```bash
npm install pdf-lib react-hot-toast
```

2. Generate the PDF template:
```bash
node scripts/generate-dot-template.js
```

3. Import and use the components in your React application.

## Usage

### Basic Implementation

```tsx
import DOTInspectionForm from './components/DOTInspectionForm';

function App() {
  return (
    <div>
      <DOTInspectionForm />
    </div>
  );
}
```

### Advanced Integration

```tsx
import { generateDOTInspectionPDF, downloadPDF, DOTInspectionData } from './lib/pdfGeneration';

// Custom form data
const formData: DOTInspectionData = {
  motorCarrierOperator: 'ABC Trucking Company',
  address: '123 Main Street',
  cityStateZip: 'Anytown, ST 12345',
  inspectorName: 'John Doe',
  reportNumber: 'RPT-2024-001',
  fleetUnitNumber: 'FLEET-001',
  date: '01/15/2024',
  vehicleType: 'TRUCK',
  vehicleIdentification: ['LIC. PLATE NO.', 'VIN'],
  inspectorQualified: true,
  components: {
    '0-0': { status: 'OK', repairedDate: '01/15/2024' },
    '0-1': { status: 'NEEDS_REPAIR', repairedDate: '01/20/2024' }
  },
  additionalConditions: 'All systems operating normally',
  certified: true
};

// Generate PDF
const pdfBlob = await generateDOTInspectionPDF(formData);
downloadPDF(pdfBlob, 'DOT_Inspection_Report.pdf');
```

## PDF Template Structure

The generated PDF template includes:

### Header Section
- Motor Carrier Operator
- Address
- City, State, Zip Code
- Inspector's Name
- Vehicle History (Report Number, Fleet Unit Number, Date)

### Vehicle Information
- Vehicle Type (TRACTOR, TRAILER, TRUCK, OTHER)
- Vehicle Identification (LIC. PLATE NO., VIN, OTHER)
- Inspector Qualification checkbox

### Inspection Table
- Component sections (1-13)
- OK/Needs Repair checkboxes
- Repaired Date fields

### Additional Sections
- Additional Conditions text area
- Certification statement
- Footer information

## Coordinate System

The PDF uses a coordinate system where:
- Origin (0,0) is at the bottom-left corner
- Page size is 8.5" x 11" (612 x 792 points)
- 72 points = 1 inch

### Key Coordinate Areas

```typescript
const DOT_PDF_COORDINATES = {
  // Header fields (top section)
  motorCarrierOperator: { x: 100, y: 720 },
  address: { x: 100, y: 690 },
  cityStateZip: { x: 100, y: 660 },
  inspectorName: { x: 350, y: 690 },
  
  // Vehicle History section
  reportNumber: { x: 500, y: 720 },
  fleetUnitNumber: { x: 500, y: 690 },
  date: { x: 500, y: 660 },
  
  // Vehicle Type checkboxes
  vehicleType: {
    tractor: { x: 100, y: 600 },
    trailer: { x: 180, y: 600 },
    truck: { x: 260, y: 600 },
    other: { x: 340, y: 600 }
  },
  
  // Inspection table
  table: {
    startY: 550,
    rowHeight: 20,
    okColumn: 400,
    needsRepairColumn: 450,
    dateColumn: 500,
    itemColumn: 100
  }
};
```

## Data Structure

### DOTInspectionData Interface

```typescript
interface DOTInspectionData {
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
```

## Customization

### Adding New Components

To add new inspection components:

1. Update `INSPECTION_COMPONENTS` in `pdfGeneration.ts`
2. Add corresponding form fields in `DOTInspectionForm.tsx`
3. Update coordinate mappings if needed

### Modifying Coordinates

If you need to adjust field positions:

1. Update coordinates in `DOT_PDF_COORDINATES`
2. Test with the template generation script
3. Verify alignment in the generated PDF

### Styling Customization

The form uses Tailwind CSS classes. Customize by:

1. Modifying className attributes in `DOTInspectionForm.tsx`
2. Adding custom CSS classes
3. Updating the PDF template generation script for different fonts/sizes

## Error Handling

The system includes comprehensive error handling:

- **Template Loading**: Handles missing or corrupted PDF templates
- **Data Validation**: Validates required fields before PDF generation
- **PDF Generation**: Catches and reports PDF generation errors
- **User Feedback**: Toast notifications for success/error states

## Performance Considerations

- **PDF Size**: Generated PDFs are optimized for size and quality
- **Memory Usage**: Efficient blob handling for large PDFs
- **Async Operations**: Non-blocking PDF generation
- **Caching**: Template loading can be cached for better performance

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **PDF Support**: Requires browser PDF viewing capabilities
- **File Download**: Uses standard browser download APIs

## Troubleshooting

### Common Issues

1. **PDF Template Not Found**
   - Ensure `public/dot-inspection-template.pdf` exists
   - Run the template generation script

2. **Field Alignment Issues**
   - Check coordinate mappings
   - Verify PDF template structure
   - Test with different screen sizes

3. **PDF Generation Fails**
   - Check browser console for errors
   - Verify all required fields are filled
   - Ensure pdf-lib is properly installed

### Debug Mode

Enable debug logging by setting:

```typescript
console.log('PDF Generation Debug:', { formData, coordinates });
```

## Future Enhancements

- **Template Customization**: Allow users to upload custom templates
- **Batch Processing**: Generate multiple PDFs at once
- **Digital Signatures**: Add digital signature support
- **Cloud Storage**: Integrate with cloud storage services
- **Mobile Optimization**: Improve mobile form experience

## License

This system is designed for internal use and compliance with DOT regulations. Ensure proper licensing for commercial use.

## Support

For technical support or questions about DOT compliance, consult:
- J.J. Keller & Associates documentation
- DOT regulations (49 CFR 396)
- Your organization's compliance team
