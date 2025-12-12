export interface RawCsvRow {
  EMPLOYEENUMBER: string;
  SUPERVISORPARTYID: string;
  FIRSTNAME: string;
  [key: string]: string; // Allow flexible extra columns but ignore them
}

export interface Employee {
  id: string;
  managerId: string | null;
  name: string;
  children: Employee[];
  depth?: number; // Added by tree traversal
  x?: number; // Added by d3
  y?: number; // Added by d3
}

export type SearchField = 'id' | 'name' | 'managerId';

export interface HierarchyData {
  root: Employee;
  maxDepth: number;
}
