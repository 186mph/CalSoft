export enum ReportType {
  // ... existing report types
  DRY_TYPE_TRANSFORMER = '2-dry-type-transformer'
}

export const getReportDisplayName = (type: ReportType) => {
  switch (type) {
    // ... existing cases
    case ReportType.DRY_TYPE_TRANSFORMER:
      return '2 - Dry Type Transformer';
    default:
      return 'Unknown Report Type';
  }
}; 