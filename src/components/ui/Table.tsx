import React, { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Table({ className = '', ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table 
        className={`w-full caption-bottom text-sm text-dark-primary dark:text-dark-secondary ${className}`} 
        {...props}
      />
    </div>
  )
}

export function TableHeader({ className = '', ...props }: TableHeaderProps) {
  return (
    <thead className={`[&_tr]:border-b-0 ${className}`} {...props} />
  )
}

export function TableBody({ className = '', ...props }: TableBodyProps) {
  return (
    <tbody
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    />
  )
}

export function TableFooter({ className = '', ...props }: TableFooterProps) {
  return (
    <tfoot
      className={`border-t bg-dark-primary/5 dark:bg-dark-200 font-medium [&>tr]:last:border-b-0 ${className}`}
      {...props}
    />
  )
}

export function TableRow({ className = '', ...props }: TableRowProps) {
  return (
    <tr
      className={`border-b border-dark-300 transition-colors hover:bg-dark-primary/5 dark:hover:bg-dark-200 data-[state=selected]:bg-dark-primary/5 dark:data-[state=selected]:bg-dark-200 ${className}`}
      {...props}
    />
  )
}

export function TableHead({ className = '', ...props }: TableHeadProps) {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-dark-primary/60 dark:text-dark-secondary/60 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}

export function TableCell({ className = '', ...props }: TableCellProps) {
  return (
    <td
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}

// Additional components for enhanced functionality
interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function TableContainer({ className = '', children, ...props }: TableContainerProps) {
  return (
    <div 
      className={`w-full overflow-hidden rounded-lg border-2 border-dark-accent/30 dark:border-dark-accent/20 bg-white dark:bg-dark-200 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function EmptyTableRow({ colSpan = 1 }: { colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-24 text-center text-dark-primary/60 dark:text-dark-secondary/60">
        No results.
      </td>
    </tr>
  )
}

export default {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  EmptyTableRow
}; 