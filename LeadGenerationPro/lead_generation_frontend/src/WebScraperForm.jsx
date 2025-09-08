import React, { useState } from 'react';
import { AlertCircle, Plus, Trash2, Globe, Database, Settings, Play, TestTube } from 'lucide-react';
import FieldMapping from './models/FieldMapping';
import ScrapeRequest from './models/ScrapeRequest';
import ScrapeResponse from './models/ScrapeResponse';

const WebScraperForm = () => {
  const [formData, setFormData] = useState({
    url: '',
    entityName: '',
    containerSelector: '',
    numAttributes: 1,
    maxItems: '',
    timeout: 15
  });

  const [attributes, setAttributes] = useState([
    { name: '', selector: '', extract: 'text' }
  ]);

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  const extractTypes = [
    { value: 'text', label: 'Text Content' },
    { value: 'href', label: 'Href Attribute' },
    { value: 'src', label: 'Src Attribute' },
    { value: 'value', label: 'Value Attribute' },
    { value: 'class', label: 'Class Attribute' },
    { value: 'id', label: 'ID Attribute' },
    { value: 'title', label: 'Title Attribute' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'numAttributes') {
      const num = parseInt(value) || 1;
      const newAttributes = Array(num).fill().map((_, i) => 
        attributes[i] || { name: '', selector: '', extract: 'text' }
      );
      setAttributes(newAttributes);
    }
  };

  const handleAttributeChange = (index, field, value) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === index ? { ...attr, [field]: value } : attr
    ));
  };

  const addAttribute = () => {
    setAttributes(prev => [...prev, { name: '', selector: '', extract: 'text' }]);
    setFormData(prev => ({ ...prev, numAttributes: attributes.length + 1 }));
  };

  const removeAttribute = (index) => {
    if (attributes.length > 1) {
      setAttributes(prev => prev.filter((_, i) => i !== index));
      setFormData(prev => ({ ...prev, numAttributes: attributes.length - 1 }));
    }
  };

  const createScrapeRequest = () => {
    const fieldMappings = {};
    attributes.forEach(attr => {
      if (attr.name && attr.selector) {
        fieldMappings[attr.name] = new FieldMapping(attr.selector, attr.extract);
      }
    });

    return new ScrapeRequest(
      formData.entityName,
      formData.url,
      formData.containerSelector || null,
      fieldMappings,
      formData.maxItems ? parseInt(formData.maxItems) : null,
      formData.timeout
    );
  };

  const scrapeWebsite = async (endpoint) => {
    setLoading(true);
    setResponse(null);

    try {
      const request = createScrapeRequest();
      
      const response = await fetch(`http://127.0.0.1:8000/scrape${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      setResponse({ ...data, endpoint });
      setActiveTab('results');
    } catch (error) {
      setResponse({
        success: false,
        message: `Request failed: ${error.message}`,
        endpoint
      });
    } finally {
      setLoading(false);
    }
  };


  const isFormValid = () => {
    return formData.url && 
           formData.entityName && 
           attributes.some(attr => attr.name && attr.selector);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Dynamic Web Scraper</h1>
                <p className="text-indigo-100 mt-1">Extract data from any website with custom configurations</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'form' 
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'results' 
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                Results
              </button>
            </div>
          </div>

          {/* Form Tab */}
          {activeTab === 'form' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Configuration */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Basic Configuration
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.entityName}
                      onChange={(e) => handleInputChange('entityName', e.target.value)}
                      placeholder="e.g., products, articles, listings"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Selector
                    </label>
                    <input
                      type="text"
                      value={formData.containerSelector}
                      onChange={(e) => handleInputChange('containerSelector', e.target.value)}
                      placeholder="e.g., .item, .card, .listing"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave empty if scraping single item or entire page
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Items
                      </label>
                      <input
                        type="number"
                        value={formData.maxItems}
                        onChange={(e) => handleInputChange('maxItems', e.target.value)}
                        placeholder="No limit"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.timeout}
                        onChange={(e) => handleInputChange('timeout', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        min="5"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                {/* Field Mappings */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Field Mappings
                    </h2>
                    <button
                      onClick={addAttribute}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Field
                    </button>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto px-10">
                    {attributes.map((attr, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Field #{index + 1}
                          </span>
                          {attributes.length > 1 && (
                            <button
                              onClick={() => removeAttribute(index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                            placeholder="Field name (e.g., title, price)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          
                          <input
                            type="text"
                            value={attr.selector}
                            onChange={(e) => handleAttributeChange(index, 'selector', e.target.value)}
                            placeholder="CSS selector (e.g., .title, h2, a)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          
                          <select
                            value={attr.extract}
                            onChange={(e) => handleAttributeChange(index, 'extract', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            {extractTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 justify-center">
                  
                  <button
                    onClick={() => testSelectors('dynamic')}
                    // disabled={!isFormValid() || loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:bg-purple-700  transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    Test Dynamic Selectors
                  </button>
                  
                  <button
                    onClick={() => scrapeWebsite('static')}
                    disabled={!isFormValid() || loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Scrape Static
                  </button>
                  
                  <button
                    onClick={() => scrapeWebsite('dynamic')}
                    disabled={!isFormValid() || loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Scrape Dynamic
                  </button>
                </div>
                
                {loading && (
                  <div className="flex justify-center mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="p-6">
              {response ? (
                <div className="space-y-6">
                  {/* Response Header */}
                  <div className={`p-4 rounded-lg border-l-4 ${
                    response.success 
                      ? 'bg-green-50 border-green-400' 
                      : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="flex items-start">
                      {response.success ? (
                        <div className="text-green-600 text-2xl mr-3">✓</div>
                      ) : (
                        <AlertCircle className="text-red-600 w-6 h-6 mr-3 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          response.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {response.isTest ? 'Selector Test' : 'Scraping'} {response.success ? 'Successful' : 'Failed'}
                        </h3>
                        <p className={`mt-1 ${
                          response.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {response.message}
                        </p>
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Endpoint:</span> {response.endpoint}
                          {response.entity_name && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="font-medium">Entity:</span> {response.entity_name}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Results */}
                  {response.isTest && response.test_results && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Test Results</h4>
                      
                      {response.test_results.container_count !== undefined && (
                        <div className="mb-3 p-3 bg-blue-100 rounded-md">
                          <span className="font-medium">Containers Found:</span> {response.test_results.container_count}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {Object.entries(response.test_results.field_tests || {}).map(([field, result]) => (
                          <div key={field} className={`p-3 rounded-md ${
                            result.found ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <div className="font-medium">
                              {result.found ? '✓' : '✗'} {field}
                            </div>
                            {result.sample_value && (
                              <div className="text-sm text-gray-600 mt-1">
                                Sample: "{result.sample_value}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scraped Data */}
                  {response.data && response.data.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Scraped Data ({response.total_items} items)
                      </h4>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-md shadow">
                          <thead className="bg-gray-100">
                            <tr>
                              {Object.keys(response.data[0]).map(key => (
                                <th key={key} className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {response.data.slice(0, 10).map((item, index) => (
                              <tr key={index} className="border-t">
                                {Object.values(item).map((value, i) => (
                                  <td key={i} className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {response.data.length > 10 && (
                          <p className="text-sm text-gray-500 mt-2">
                            Showing first 10 of {response.data.length} items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No results yet</p>
                  <p className="text-sm">Configure your scraper and run a test or scraping operation</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebScraperForm;