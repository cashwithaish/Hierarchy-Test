import Papa from 'papaparse';
import { Employee, RawCsvRow } from '../types';

/**
 * Parses a CSV string into a raw array of objects.
 */
export const parseCsv = (csvString: string): Promise<RawCsvRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV Warnings:", results.errors);
        }
        // Normalize keys to upper case to handle variations like EmployeeNumber vs EMPLOYEENUMBER
        const normalizedData = (results.data as Record<string, string>[]).map(row => {
          const newRow: any = {};
          Object.keys(row).forEach(key => {
            newRow[key.toUpperCase().trim()] = row[key];
          });
          return newRow as RawCsvRow;
        });
        resolve(normalizedData);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

/**
 * Converts raw CSV rows into a Map of ID -> Employee for fast lookup.
 */
export const buildEmployeeMap = (rows: RawCsvRow[]): Map<string, Employee> => {
  const employeeMap = new Map<string, Employee>();

  rows.forEach(row => {
    // Robust access to fields
    const id = row.EMPLOYEENUMBER || row['EMPLOYEE ID'];
    const managerId = row.SUPERVISORPARTYID || row['MANAGER ID'] || row['SUPERVISOR ID'];
    const name = row.FIRSTNAME || row['NAME'] || row['FULL NAME'];

    if (id) {
      employeeMap.set(id, {
        id: id,
        managerId: managerId ? managerId : null,
        name: name || 'Unknown',
        children: []
      });
    }
  });

  // Second pass: Link children to parents
  employeeMap.forEach((employee) => {
    if (employee.managerId) {
      const manager = employeeMap.get(employee.managerId);
      if (manager) {
        manager.children.push(employee);
      } else {
        // Manager ID exists but is not in the dataset. 
        // Treat as root for this visualization context or handle gracefully.
        console.warn(`Manager ${employee.managerId} not found for employee ${employee.id}`);
      }
    }
  });

  return employeeMap;
};

/**
 * Searches the employee map based on query and type.
 */
export const searchEmployees = (
  map: Map<string, Employee>, 
  query: string, 
  field: 'id' | 'name' | 'managerId'
): Employee[] => {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];

  const results: Employee[] = [];

  map.forEach(employee => {
    if (field === 'id') {
      if (employee.id.toLowerCase().includes(queryLower)) {
        results.push(employee);
      }
    } else if (field === 'name') {
      if (employee.name.toLowerCase().includes(queryLower)) {
        results.push(employee);
      }
    } else if (field === 'managerId') {
      if (employee.managerId && employee.managerId.toLowerCase().includes(queryLower)) {
        results.push(employee);
      }
    }
  });

  return results;
};

/**
 * Builds a hierarchy suitable for D3 starting from a specific root node.
 * This effectively creates a "subtree" view.
 */
export const buildSubtree = (rootNode: Employee): Employee => {
  // Deep copy to avoid mutating the original map structure during D3 layout mutations if we were doing in-place,
  // but here we just return the reference because D3's hierarchy method will create a wrapper.
  // However, for safety in React strict mode, let's treat the structure as read-only and let D3 handle the hierarchy wrapper.
  return rootNode;
};
