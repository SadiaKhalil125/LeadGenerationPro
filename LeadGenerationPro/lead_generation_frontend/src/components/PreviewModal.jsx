import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PreviewModal = ({ data, onClose, onNext, onPrevious, currentStep, isLoading = false }) => {
  if (!data) return null;

  const getAllHeaders = () => {
    if (!data.data || data.data.length === 0) return [];
    const headerSet = new Set();
    data.data.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
  };

  const headers = getAllHeaders();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-teal-700">
              Preview: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{data.entity_name}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors ${isLoading ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
          >
            <X size={24} className={`${isLoading ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="px-6 py-3 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading...</p>
            </div>
          ) : (
            <>
              {data.data && data.data.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-800 uppercase">
                      <tr>
                        {headers.map(header => (
                          <th key={header} className="px-6 py-3 font-semibold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                          {headers.map(header => (
                            <td key={`${index}-${header}`} className="px-6 py-4">
                              {String(item[header] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No data returned.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-2">
            <button
              onClick={onPrevious}
              disabled={currentStep <= 1 || isLoading}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                currentStep <= 1 || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-black hover:bg-gray-200'
              }`}
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <button
              onClick={onNext}
              disabled={isLoading}
              className={`px-4 py-2 font-medium rounded-lg flex items-center gap-2 transition-colors ${
                isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-black hover:bg-gray-200'
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;