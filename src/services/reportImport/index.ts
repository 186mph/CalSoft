import { SwitchgearImporter } from './SwitchgearImporter';
import { ReportData, ReportImportResult } from './types';

export class ReportImportService {
  private importers = [
    new SwitchgearImporter(),
    // Add other importers here as they are implemented
  ];

  async importReport(
    data: ReportData,
    jobId: string,
    userId: string
  ): Promise<ReportImportResult> {
    // Find the appropriate importer
    const importer = this.importers.find(imp => imp.canImport(data));

    if (!importer) {
      return {
        success: false,
        error: 'No suitable importer found for this report type'
      };
    }

    try {
      return await importer.import(data, jobId, userId);
    } catch (error: any) {
      console.error('Error importing report:', error);
      return {
        success: false,
        error: error.message || 'Failed to import report'
      };
    }
  }
}

// Export a singleton instance
export const reportImportService = new ReportImportService(); 