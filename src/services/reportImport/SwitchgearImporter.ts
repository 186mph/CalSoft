import { BaseImporter } from './BaseImporter';
import { ContactResistanceData, DatabaseSchema, ReportData, ReportImportResult, ReportImporter } from './types';
import { supabase } from '../../lib/supabase';

export class SwitchgearImporter extends BaseImporter implements ReportImporter {
  protected tableName = 'switchgear_reports';
  protected requiredColumns = ['job_id', 'user_id', 'report_info'];

  canImport(data: ReportData): boolean {
    // Check if the data has switchgear-specific fields
    return (
      data.switchgear !== undefined ||
      data.equipmentInfo !== undefined ||
      data.switchboard !== undefined ||
      data.gear !== undefined ||
      (data.type && (
        data.type.toLowerCase().includes('switchgear') ||
        data.type.toLowerCase().includes('switch') ||
        data.type.toLowerCase().includes('gear')
      ))
    );
  }

  async import(data: ReportData, jobId: string, userId: string): Promise<ReportImportResult> {
    // Log the full data structure to verify
    console.log('Importing switchgear data:', {
      hasDielectricTests: !!data.data?.dielectricWithstandTests,
      dielectricTestsLength: data.data?.dielectricWithstandTests?.length
    });
    
    return this.insertReport(data, jobId, userId);
  }

  protected prepareData(
    data: ReportData,
    jobId: string,
    userId: string,
    schema: DatabaseSchema
  ): Record<string, any> {
    // First, try to get the actual report data from the nested structure
    let reportData = data;
    if (data.data) {
      reportData = data.data;
    }

    console.log('Preparing switchgear data:', {
      reportDataKeys: Object.keys(reportData),
      hasDielectricTests: !!reportData.dielectricWithstandTests,
      dielectricTestsLength: reportData.dielectricWithstandTests?.length
    });

    // Build the data object with only columns that exist
    const dataToInsert: Record<string, any> = {
      job_id: jobId,
      user_id: userId,
    };

    // Only add status and comments if they exist as top-level columns
    if (schema.columns.includes('status')) {
      dataToInsert.status = reportData.status || 'PASS';
    }

    if (schema.columns.includes('comments')) {
      dataToInsert.comments = reportData.comments || '';
    }

    // Always include JSONB columns with complete data
    if (schema.columns.includes('report_info')) {
      // IMPORTANT: Remove jobNumber from the reportData before saving 
      // to ensure consistency with the parent job.
      // The actual job association is handled by the top-level job_id column.
      if ('jobNumber' in reportData) {
        console.log(`Removing jobNumber '${reportData.jobNumber}' from imported report_info.`);
        delete reportData.jobNumber;
      }
      // Similarly, remove other fields that might mismatch the parent job if needed
      // delete reportData.customerName; 
      // delete reportData.customerLocation;
      
      // Take the (potentially modified) reportData object and use it as the report_info
      dataToInsert.report_info = { ...reportData };
    }

    // Include the specialized JSONB columns
    if (schema.columns.includes('visual_mechanical')) {
      dataToInsert.visual_mechanical = {
        items: reportData.visualInspectionItems || []
      };
    }

    if (schema.columns.includes('insulation_resistance')) {
      dataToInsert.insulation_resistance = {
        tests: reportData.insulationResistanceTests || []
      };
    }

    // CRITICAL: This is where the dielectric withstand tests need to go
    // The SwitchgearReport component loads them from contact_resistance.dielectricTests
    if (schema.columns.includes('contact_resistance')) {
      const contactResistanceData: ContactResistanceData = {
        tests: reportData.contactResistanceTests || []
      };
      
      // Add dielectric withstand tests to contact resistance object
      if (reportData.dielectricWithstandTests) {
        console.log('Adding dielectric withstand tests to contact_resistance.dielectricTests');
        contactResistanceData.dielectricTests = reportData.dielectricWithstandTests;
      }
      
      dataToInsert.contact_resistance = contactResistanceData;
    }

    if (schema.columns.includes('dielectric_withstand')) {
      // Access dielectricWithstandTests directly from reportData
      const dielectricData = reportData.dielectricWithstandTests;
      
      console.log('Processing dielectric withstand data:', {
        rawData: dielectricData,
        schemaHasColumn: schema.columns.includes('dielectric_withstand'),
        dataStructure: {
          hasTests: !!dielectricData,
          isArray: Array.isArray(dielectricData),
          length: dielectricData?.length || 0,
          firstItem: dielectricData?.[0]
        }
      });
      
      dataToInsert.dielectric_withstand = {
        tests: dielectricData || []
      };
    }

    console.log('Final data structure:', {
      hasContactResistance: !!dataToInsert.contact_resistance,
      hasDielectricTests: !!dataToInsert.contact_resistance?.dielectricTests,
      dielectricTestsLength: dataToInsert.contact_resistance?.dielectricTests?.length
    });

    return dataToInsert;
  }

  protected getReportType(): string {
    // Standardize to hyphenated version to match routing
    return 'switchgear-report'; 
  }
} 