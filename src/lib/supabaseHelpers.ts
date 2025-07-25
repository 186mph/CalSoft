import { SupabaseClient } from '@supabase/supabase-js'
import { getTable } from './schema'

// Extended Supabase client with schema support
export function schemaFrom(supabase: SupabaseClient, tableName: string) {
  // Use the schema mapping to get the correct schema-qualified table name
  const schemaQualifiedTable = getTable(tableName)
  
  // Return the query builder with the correct table name
  return supabase.from(schemaQualifiedTable)
}

// Helper for migrations - this wraps supabase.from() to automatically use the correct schema
// Make the function generic to accept any schema type (must be string)
export function wrapSupabaseClient<SchemaName extends string = 'public'>(
  supabase: SupabaseClient<any, SchemaName>
): SupabaseClient<any, SchemaName> {
  const originalFrom = supabase.from.bind(supabase)
  
  // Override the from method to use schema mapping
  supabase.from = (tableName: string) => {
    return originalFrom(getTable(tableName))
  }
  
  return supabase
}

/**
 * Safely formats a UUID for use in SQL queries to prevent numeric literal errors
 * @param uuid The UUID string to format
 * @returns The UUID string properly formatted for SQL
 */
export function safeUUID(uuid: string): string {
  if (!uuid) return '';
  return uuid.toString().replace(/[-]/g, ''); // Remove hyphens for safety
}

/**
 * Helper function to safely query by UUID with Supabase
 * @param query The Supabase query builder
 * @param columnName The column name containing UUIDs
 * @param uuid The UUID to search for
 * @returns The query with a safe UUID comparison
 */
export function queryByUUID(query: any, columnName: string, uuid: string) {
  return query.filter(`${columnName}::text`, 'eq', uuid);
} 