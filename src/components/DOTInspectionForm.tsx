import React, { useState } from 'react';
import { generateDOTInspectionPDF, downloadPDF, DOTInspectionData } from '../lib/pdfGeneration';
import { toast } from 'react-hot-toast';

// Component sections for the inspection form
const INSPECTION_SECTIONS = [
  {
    id: 'brake-system',
    title: '1. BRAKE SYSTEM',
    items: [
      { id: '0-0', label: 'a. Service Brakes' },
      { id: '0-1', label: 'b. Parking Brake System' },
      { id: '0-2', label: 'c. Brake Drums or Rotors' },
      { id: '0-3', label: 'd. Brake Hose' },
      { id: '0-4', label: 'e. Brake Tubing' },
      { id: '0-5', label: 'f. Low Pressure Warning Device' },
      { id: '0-6', label: 'g. Tractor Protection Valve' },
      { id: '0-7', label: 'h. Air Compressor' },
      { id: '0-8', label: 'i. Electric Brakes' },
      { id: '0-9', label: 'j. Hydraulic Brakes' },
      { id: '0-10', label: 'k. Vacuum Systems' }
    ]
  },
  {
    id: 'coupling-devices',
    title: '2. COUPLING DEVICES',
    items: [
      { id: '1-0', label: 'a. Fifth Wheels' },
      { id: '1-1', label: 'b. Pintle Hooks' },
      { id: '1-2', label: 'c. Drawbar/Towbar Eye' },
      { id: '1-3', label: 'd. Drawbar/Towbar Tongue' },
      { id: '1-4', label: 'e. Safety Devices' },
      { id: '1-5', label: 'f. Saddle-Mounts' }
    ]
  },
  {
    id: 'exhaust-system',
    title: '3. EXHAUST SYSTEM',
    items: [
      { id: '2-0', label: 'a. Any exhaust system determined to be leaking at a point forward of or directly below the driver/sleeper compartment.' },
      { id: '2-1', label: 'b. A bus exhaust system leaking or discharging to the atmosphere in violation of standards (1), (2) or (3).' },
      { id: '2-2', label: 'c. No part of the exhaust system of any motor vehicle shall be so located as would be likely to result in burning, charring, or damaging the electrical wiring, the fuel supply, or any combustible part of the motor vehicle.' }
    ]
  },
  {
    id: 'fuel-system',
    title: '4. FUEL SYSTEM',
    items: [
      { id: '3-0', label: 'a. Visible leak' },
      { id: '3-1', label: 'b. Fuel tank filler cap missing' },
      { id: '3-2', label: 'c. Fuel tank securely attached' }
    ]
  },
  {
    id: 'lighting-devices',
    title: '5. LIGHTING DEVICES',
    items: [
      { id: '4-0', label: 'All lighting devices and reflectors required by Section 393 shall be operable.' }
    ]
  }
];

export default function DOTInspectionForm() {
  // Form state
  const [formData, setFormData] = useState<DOTInspectionData>({
    motorCarrierOperator: '',
    address: '',
    cityStateZip: '',
    inspectorName: '',
    reportNumber: '',
    fleetUnitNumber: '',
    date: new Date().toLocaleDateString(),
    vehicleType: 'TRUCK',
    vehicleIdentification: [],
    inspectorQualified: false,
    components: {},
    additionalConditions: '',
    certified: false
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Handle text field changes
  const handleTextChange = (field: keyof DOTInspectionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle vehicle type change
  const handleVehicleTypeChange = (type: 'TRACTOR' | 'TRAILER' | 'TRUCK' | 'OTHER') => {
    setFormData(prev => ({
      ...prev,
      vehicleType: type
    }));
  };

  // Handle vehicle identification change
  const handleVehicleIdentificationChange = (identification: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      vehicleIdentification: checked 
        ? [...prev.vehicleIdentification, identification]
        : prev.vehicleIdentification.filter(id => id !== identification)
    }));
  };

  // Handle component status change
  const handleComponentChange = (componentId: string, status: 'OK' | 'NEEDS_REPAIR' | null, repairedDate?: string) => {
    setFormData(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: status ? { status, repairedDate } : undefined
      }
    }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field: keyof DOTInspectionData, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate PDF
  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Generate the PDF
      const pdfBlob = await generateDOTInspectionPDF(formData);
      
      // Download the PDF
      const filename = `DOT_Inspection_Report_${formData.motorCarrierOperator || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
      
      toast.success('DOT Inspection PDF generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please check the console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">DOT Inspection Form</h1>
        <p className="text-gray-600 mt-2">Fill out the form below to generate a DOT Inspection PDF</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motor Carrier Operator
            </label>
            <input
              type="text"
              value={formData.motorCarrierOperator}
              onChange={(e) => handleTextChange('motorCarrierOperator', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inspector's Name
            </label>
            <input
              type="text"
              value={formData.inspectorName}
              onChange={(e) => handleTextChange('inspectorName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleTextChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City, State, Zip Code
            </label>
            <input
              type="text"
              value={formData.cityStateZip}
              onChange={(e) => handleTextChange('cityStateZip', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Number
            </label>
            <input
              type="text"
              value={formData.reportNumber}
              onChange={(e) => handleTextChange('reportNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fleet Unit Number
            </label>
            <input
              type="text"
              value={formData.fleetUnitNumber}
              onChange={(e) => handleTextChange('fleetUnitNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Vehicle Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Vehicle Type</label>
          <div className="flex space-x-4">
            {(['TRACTOR', 'TRAILER', 'TRUCK', 'OTHER'] as const).map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  name="vehicleType"
                  value={type}
                  checked={formData.vehicleType === type}
                  onChange={() => handleVehicleTypeChange(type)}
                  className="mr-2"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Vehicle Identification */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Vehicle Identification</label>
          <div className="flex space-x-4">
            {(['LIC. PLATE NO.', 'VIN', 'OTHER'] as const).map((identification) => (
              <label key={identification} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.vehicleIdentification.includes(identification)}
                  onChange={(e) => handleVehicleIdentificationChange(identification, e.target.checked)}
                  className="mr-2"
                />
                {identification}
              </label>
            ))}
          </div>
        </div>

        {/* Inspector Qualification */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.inspectorQualified}
              onChange={(e) => handleCheckboxChange('inspectorQualified', e.target.checked)}
              className="mr-2"
            />
            This Inspector Meets the Qualification Requirements in Section 396.19
          </label>
        </div>

        {/* Inspection Components */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Components Inspected</h3>
          <div className="space-y-4">
            {INSPECTION_SECTIONS.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{section.title}</h4>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`component-${item.id}`}
                            value="OK"
                            checked={formData.components[item.id]?.status === 'OK'}
                            onChange={() => handleComponentChange(item.id, 'OK')}
                            className="mr-1"
                          />
                          OK
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`component-${item.id}`}
                            value="NEEDS_REPAIR"
                            checked={formData.components[item.id]?.status === 'NEEDS_REPAIR'}
                            onChange={() => handleComponentChange(item.id, 'NEEDS_REPAIR')}
                            className="mr-1"
                          />
                          Needs Repair
                        </label>
                        {(formData.components[item.id]?.status === 'OK' || formData.components[item.id]?.status === 'NEEDS_REPAIR') && (
                          <input
                            type="date"
                            value={formData.components[item.id]?.repairedDate || ''}
                            onChange={(e) => handleComponentChange(item.id, formData.components[item.id]?.status || 'OK', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Conditions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            List any other condition which may prevent safe operation of this vehicle
          </label>
          <textarea
            value={formData.additionalConditions}
            onChange={(e) => handleTextChange('additionalConditions', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Certification */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.certified}
              onChange={(e) => handleCheckboxChange('certified', e.target.checked)}
              className="mr-2"
            />
            CERTIFICATION: THIS VEHICLE HAS PASSED ALL THE INSPECTION ITEMS FOR THE ANNUAL VEHICLE INSPECTION REPORT IN ACCORDANCE WITH 49 CFR 396.
          </label>
        </div>

        {/* Generate PDF Button */}
        <div className="text-center">
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isGenerating ? 'Generating PDF...' : 'Generate DOT Inspection PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
