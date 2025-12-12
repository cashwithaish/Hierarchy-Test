import React, { useState } from 'react';
import { Search, Users, RefreshCw, X } from 'lucide-react';
import FileUploader from './components/FileUploader';
import OrgChart from './components/OrgChart';
import { parseCsv, buildEmployeeMap, searchEmployees } from './utils/dataProcessing';
import { Employee, SearchField } from './types';

function App() {
  const [employeeMap, setEmployeeMap] = useState<Map<string, Employee> | null>(null);
  const [viewRoot, setViewRoot] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchField>('name');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const handleUpload = async (csvContent: string) => {
    setIsLoading(true);
    setUploadError(undefined);
    try {
      const rawData = await parseCsv(csvContent);
      if (rawData.length === 0) {
        throw new Error("CSV file is empty or invalid.");
      }
      const map = buildEmployeeMap(rawData);
      setEmployeeMap(map);
      
      // Default view: Find a potential root
      let defaultRoot = map.values().next().value;
      for (const emp of map.values()) {
        if (!emp.managerId || !map.has(emp.managerId)) {
          defaultRoot = emp;
          break;
        }
      }
      setViewRoot(defaultRoot);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to parse CSV. Please check the format.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeMap || !searchQuery) return;
    
    const results = searchEmployees(employeeMap, searchQuery, searchType);
    setSearchResults(results);

    if (results.length === 1) {
      selectEmployee(results[0]);
    }
  };

  const selectEmployee = (emp: Employee) => {
    setViewRoot(emp);
    setSearchResults([]);
    setSearchQuery(''); 
  };

  const goUp = () => {
    if (!viewRoot || !viewRoot.managerId || !employeeMap) return;
    const manager = employeeMap.get(viewRoot.managerId);
    if (manager) {
      setViewRoot(manager);
    }
  };

  const resetData = () => {
    setEmployeeMap(null);
    setViewRoot(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm flex-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-2 rounded-lg shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Hierarchy<span className="text-indigo-600">Viz</span>
            </h1>
          </div>
          
          {employeeMap && (
            <div className="flex items-center gap-4">
               {/* Search Bar in Header when active */}
               <div className="relative hidden md:block w-96">
                  <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search by ${searchType}...`}
                      className="w-full pl-9 pr-20 py-1.5 text-sm rounded-full border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {(['name', 'id'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSearchType(t)}
                          className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${searchType === t ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </form>
                  {/* Dropdown Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 max-h-80 overflow-y-auto z-50">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectEmployee(result)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{result.name}</p>
                            <p className="text-xs text-slate-500">#{result.id}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
               </div>

              <button 
                onClick={resetData}
                className="text-slate-500 hover:text-red-600 text-sm font-medium flex items-center gap-2 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {!employeeMap ? (
          /* Upload State */
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
            <div className="text-center mb-10 max-w-2xl animate-fade-in-up">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Visualize Your Organization
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Drag and drop your employee CSV to generate an interactive, zoomable hierarchy chart instantly.
              </p>
            </div>
            <FileUploader onUpload={handleUpload} error={uploadError} />
            
            {isLoading && (
              <div className="mt-8 flex items-center gap-3 text-indigo-600 bg-indigo-50 px-6 py-3 rounded-full">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="font-medium">Building hierarchy...</span>
              </div>
            )}
          </div>
        ) : (
          /* Visualization State */
          <div className="w-full h-full relative">
            {/* Mobile/Tablet Search (if screen small) */}
            <div className="md:hidden absolute top-4 left-4 right-4 z-30">
                 <div className="relative bg-white rounded-lg shadow-lg">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
                 {searchResults.length > 0 && (
                    <div className="mt-1 bg-white rounded-lg shadow-xl border border-slate-100 max-h-40 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectEmployee(result)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50"
                        >
                          {result.name}
                        </button>
                      ))}
                    </div>
                  )}
            </div>

            {viewRoot ? (
              <OrgChart 
                rootNode={viewRoot} 
                onNodeClick={selectEmployee}
                onGoUp={viewRoot.managerId && employeeMap.has(viewRoot.managerId) ? goUp : undefined}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                <p>No data available.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;