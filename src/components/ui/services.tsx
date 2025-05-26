/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Services page component with an API explorer Drawer.
 * Fetches data from /api/services on mount and allows custom API calls via input.
 * Displays JSON data with a copy button, styled in a small monospace font.
 *
 * @module app/services/page
 * @requires react
 * @requires @/components/ui/drawer
 * @requires @/components/ui/input
 * @requires @/components/ui/button
 * @requires @/globals.css
 */
"use client";
import React, { useState, useEffect, JSX } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import '@/globals.css';

const Services: React.FC = () => {
  const [apiData, setApiData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('videos');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // Fetch API data
  const fetchApiData = async (title: string) => {
    try {
      const response = await fetch(`/api/${title}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      setApiData(data);
      setError('');
      console.log(`\x1b[32mFetched /api/${title} successfully\x1b[0m`);
    } catch (err: any) {
      setError(`Failed to fetch /api/${title}: ${err.message}`);
      setApiData(null);
      console.error(`\x1b[31mError fetching /api/${title}: ${err.message}\x1b[0m`);
    }
  };

  // Initial fetch for /api/services
  useEffect(() => {
    fetchApiData('services');
  }, []);

  // Handle input and Enter key
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageTitle(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pageTitle.trim()) {
      fetchApiData(pageTitle.trim());
    }
  };

  // Copy JSON to clipboard
  const copyToClipboard = () => {
    if (apiData) {
      navigator.clipboard.writeText(JSON.stringify(apiData, null, 2));
      console.log(`\x1b[32mJSON copied to clipboard\x1b[0m`);
    }
  };

  // Toggle JSON node expansion
  const toggleNode = (path: string) => {
    setExpandedNodes((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Render JSON recursively
  const renderJson = (data: any, path: string = ''): JSX.Element => {
    if (typeof data !== 'object' || data === null) {
      return <span>{JSON.stringify(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const keys = isArray ? data.map((_, i) => i.toString()) : Object.keys(data);
    const isExpanded = expandedNodes.includes(path);

    return (
      <div className="ml-4">
        <span
          className="cursor-pointer text-blue-400"
          onClick={() => toggleNode(path)}
        >
          {isExpanded ? '[-]' : '[+]'} {isArray ? 'Array' : 'Object'}
        </span>
        {isExpanded && (
          <div>
            {keys.map((key) => {
              const newPath = path ? `${path}.${key}` : key;
              return (
                <div key={newPath} className="ml-4">
                  <span className="text-green-400">{key}: </span>
                  {renderJson(data[key], newPath)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Drawer>
        <DrawerTrigger>
          <div className="border-2 border-white/10 rounded xl b2 p-2">API</div>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>gc services</DrawerTitle>
            <DrawerDescription>
              <div className="text-left">
                <Input
                  type="text"
                  placeholder="Enter API page title (e.g., videos)"
                  value={pageTitle}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="mb-4 bg-black/50 text-white border-white/20 text-xs font-mono"
                />
                <div className="detail overflow-y-scroll max-h-[60vh]">
                  <h2 className="text-sm">&gt;JSON DATA</h2>
                  <div className="bg-black/50 p-2 rounded text-xs font-mono text-white">
                    <div>route: /api/{pageTitle}</div>
                  </div>

                  <h2 className="text-sm mt-4">&gt;DATA</h2>
                  <div className="bg-black/50 p-2 rounded text-xs font-mono text-white relative">
                    {error ? (
                      <div className="text-red-400">{error}</div>
                    ) : apiData ? (
                      <>
                        {renderJson(apiData)}
                        <Button
                          variant="outline"
                          className="absolute top-2 right-2 text-xs bg-black/70 text-white border-white/20"
                          onClick={copyToClipboard}
                        >
                          Copy
                        </Button>
                      </>
                    ) : (
                      <div>Loading...</div>
                    )}
                  </div>
                </div>
              </div>
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Services;