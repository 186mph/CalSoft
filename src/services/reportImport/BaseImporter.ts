import { supabase } from '../../lib/supabase';
import { DatabaseSchema, ReportData, ReportImportResult } from './types';

export abstract class BaseImporter {
  protected abstract tableName: string;
  protected abstract requiredColumns: string[];

  protected async getSchema(): Promise<DatabaseSchema> {
    // Call the dedicated function to get column names and types
    const { data: columnsData, error: schemaError } = await supabase
      .rpc('get_table_columns', { p_table_name: this.tableName });

    if (schemaError || !columnsData) {
      console.error(`Error fetching schema for table ${this.tableName} using get_table_columns:`, schemaError);
      // Provide a more specific error message
      const errorMessage = schemaError?.message || 'Unknown error fetching schema';
      throw new Error(`Could not determine schema for table ${this.tableName}. Ensure the 'get_table_columns' function exists and the backend role has execute permissions. Error: ${errorMessage}`);
    }
    
    // Check if the response is an array, as expected from the function
    if (!Array.isArray(columnsData)) {
        console.error(`Unexpected schema response format from get_table_columns for ${this.tableName}:`, columnsData);
        throw new Error(`Unexpected schema response format for table ${this.tableName} from get_table_columns. Expected an array.`);
    }

    const columns = columnsData.map((col: any) => col.column_name);
    const jsonbColumns = columnsData
      .filter((col: any) => col.data_type === 'jsonb')
      .map((col: any) => col.column_name);

    // Optional: Fetch a sample row to help with type detection if needed later,
    // but primary schema comes from information_schema
    // const { data: sampleRow } = await supabase
    //   .from(this.tableName)
    //   .select('*')
    //   .limit(1)
    //   .maybeSingle(); 

    return { columns, jsonbColumns };
  }

  protected async validateSchema(): Promise<void> {
    const schema = await this.getSchema();
    const missingColumns = this.requiredColumns.filter(
      col => !schema.columns.includes(col)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Table ${this.tableName} is missing required columns: ${missingColumns.join(', ')}`
      );
    }
  }

  protected async insertReport(
    data: ReportData,
    jobId: string,
    userId: string
  ): Promise<ReportImportResult> {
    try {
      await this.validateSchema();
      const schema = await this.getSchema();

      // Prepare the data for insertion
      const dataToInsert = this.prepareData(data, jobId, userId, schema);

      // Insert the report
      const { data: insertedReport, error } = await supabase
        .schema('neta_ops') // Always use neta_ops schema explicitly
        .from(this.tableName)
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error(`Error inserting report into ${this.tableName}:`, error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        reportId: insertedReport.id,
        reportType: this.getReportType() 
      };
    } catch (error: any) {
      console.error(`Error in ${this.tableName} import:`, error);
      return { success: false, error: error.message };
    }
  }

  protected getReportType(): string {
    // Extract report type from table name by removing '_reports' suffix
    return this.tableName.replace('_reports', '');
  }

  protected abstract prepareData(
    data: ReportData,
    jobId: string,
    userId: string,
    schema: DatabaseSchema
  ): Record<string, any>;
} 