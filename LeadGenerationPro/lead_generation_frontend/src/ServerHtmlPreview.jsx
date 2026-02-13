// SmartWebsitePreview.jsx - MODIFIED: Never uses IDs, only tag.class(es)
import React, { useState, useEffect, useRef } from "react";
import { Code, AlertTriangle } from "lucide-react";
import API_BASE from "./api_base";

export default function SmartWebsitePreview({ url, onSelectorSelected }) {
  const [status, setStatus] = useState("idle");
  const [htmlContent, setHtmlContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSelectedSelector, setLastSelectedSelector] = useState("");
  const iframeRef = useRef(null);
  const selectedCallbackRef = useRef(null);

  // Set the callback for when a selector is selected
  useEffect(() => {
    selectedCallbackRef.current = onSelectorSelected;
  }, [onSelectorSelected]);

  // -------------------------
  // FETCH LOGIC
  // -------------------------

  useEffect(() => {
    const handler = setTimeout(() => {
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        fetchContent(url);
      } else {
        setStatus("idle");
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [url]);

  const fetchContent = async (urlToFetch) => {
    setStatus("loading");
    setHtmlContent("");
    setErrorMessage("");
    setLastSelectedSelector("");

    try {
      await fetchPreview(urlToFetch);
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  const fetchPreview = async (urlToFetch) => {
    try {
      let res = await fetch(`${API_BASE}/fetchcontent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ url: urlToFetch }),
      });

      let data = await res.json();

      // Check if needs JavaScript rendering
      const needsJS =
        !data.success ||
        (data.content &&
          (data.content.toLowerCase().includes("enable javascript") ||
            data.content.toLowerCase().includes("please enable javascript") ||
            data.content.toLowerCase().includes("javascript is disabled") ||
            data.content.trim().length < 50));

      if (needsJS) {
        res = await fetch(`${API_BASE}/fetchcontent-js`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ url: urlToFetch }),
        });

        data = await res.json();
      }

      if (!data.success) throw new Error(data.error);

      // Add enhanced click detection
      const modifiedHtml = addClickDetection(data.content);
      setHtmlContent(modifiedHtml);
      setStatus("success");
    } catch (error) {
      throw new Error(`Preview failed: ${error.message}`);
    }
  };

  // CSS escape helper
  const cssEscape = (str) => {
    return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
  };

  // Add click detection to HTML - MODIFIED: Never uses IDs, only tag.class(es)
  const addClickDetection = (html) => {
    const clickScript = `
      <script>
        // CSS selector generation for scraping - NEVER uses IDs, only tag.class(es)
        function generateSelector(element) {
          if (!element || !(element instanceof Element)) return '';
          
          // START WITH TAG NAME (ALWAYS)
          let selector = element.tagName.toLowerCase();
          
          // ADD ALL VALID CLASSES (filtering out preview classes)
          if (element.className && typeof element.className === 'string') {
            // Get classes, filter empty strings and preview classes
            const classes = element.className.trim().split(/\\s+/).filter(c => c && c.trim());
            const filteredClasses = classes.filter(cls => 
              cls !== 'preview-hover' && cls !== 'preview-clicked'
            );
            
            // Add ALL filtered classes (if any)
            if (filteredClasses.length > 0) {
              selector += '.' + filteredClasses.map(cssEscape).join('.');
            }
          }
          
          // COMPLETELY IGNORE IDS - they are NEVER included in the selector
          // No ID check, no ID usage, no fallback to ID
          
          return selector;
        }
        
        // CSS escape helper
        function cssEscape(str) {
          if (!str) return '';
          return str.replace(/[!"#$%&'()*+,.\\/:;<=>?@[\\\\\\]^\`{|}~]/g, '\\\\$&');
        }
        
        // Hover highlighting and selector preview
        let hoverTimeout = null;
        let lastHovered = null;
        let lastSelected = null;
        let hoverTooltip = null;
        
        // Create hover styles
        const hoverStyle = document.createElement('style');
        hoverStyle.textContent = \`
          .preview-hover {
            outline: 2px dashed #4285f4 !important;
            outline-offset: 2px !important;
            background-color: rgba(66, 133, 244, 0.1) !important;
            cursor: crosshair !important;
          }
          .preview-clicked {
            outline: 2px solid #ea4335 !important;
            outline-offset: 2px !important;
            background-color: rgba(234, 67, 53, 0.15) !important;
          }
        \`;
        document.head.appendChild(hoverStyle);
        
        // Create tooltip for selector preview
        function createTooltip() {
          if (!hoverTooltip) {
            hoverTooltip = document.createElement('div');
            hoverTooltip.id = 'preview-tooltip';
            hoverTooltip.style.cssText = \`
              position: fixed;
              background: rgba(0, 0, 0, 0.85);
              color: white;
              padding: 6px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-family: monospace;
              z-index: 100000;
              pointer-events: none;
              border: 1px solid rgba(255, 255, 255, 0.1);
              max-width: 300px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              display: none;
            \`;
            document.body.appendChild(hoverTooltip);
          }
          return hoverTooltip;
        }
        
        // Hover event handler
        document.addEventListener('mousemove', function(e) {
          clearTimeout(hoverTimeout);
          
          // Remove hover from previous element
          if (lastHovered && lastHovered !== e.target) {
            lastHovered.classList.remove('preview-hover');
          }
          
          hoverTimeout = setTimeout(() => {
            const el = e.target;
            if (el && el.nodeType === Node.ELEMENT_NODE && el !== lastSelected) {
              lastHovered = el;
              el.classList.add('preview-hover');
              
              // Show selector preview in tooltip (tag.classes only, NO IDS)
              const selector = generateSelector(el);
              const tooltip = createTooltip();
              tooltip.textContent = selector;
              tooltip.style.left = (e.clientX + 15) + 'px';
              tooltip.style.top = (e.clientY + 15) + 'px';
              tooltip.style.display = 'block';
            }
          }, 50);
        });
        
        // Mouse out handler
        document.addEventListener('mouseout', function(e) {
          clearTimeout(hoverTimeout);
          if (e.target) {
            e.target.classList.remove('preview-hover');
          }
          if (hoverTooltip) {
            hoverTooltip.style.display = 'none';
          }
        });
        
        // Double Click handler
        document.addEventListener('dblclick', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const element = e.target;
          if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return;
          }
          
          // Remove hover
          element.classList.remove('preview-hover');
          if (lastHovered === element) {
            lastHovered = null;
          }
          
          // Hide tooltip
          if (hoverTooltip) {
            hoverTooltip.style.display = 'none';
          }
          
          // Remove previous selection
          if (lastSelected && lastSelected !== element) {
            lastSelected.classList.remove('preview-clicked');
          }
          
          // Add click highlight (persistent until next selection)
          element.classList.add('preview-clicked');
          lastSelected = element;
          
          // Generate selector - NO IDS, ONLY tag.class(es)
          const selector = generateSelector(element);
          
          // Get text content for context
          let textContent = '';
          try {
            textContent = element.textContent ? element.textContent.trim().slice(0, 200) : '';
            if (element.textContent && element.textContent.trim().length > 200) {
              textContent += '...';
            }
          } catch (e) {
            textContent = '';
          }
          
          // Send selector to parent (ID is explicitly set to empty string)
          window.parent.postMessage({
            type: 'SELECTOR_SELECTED',
            selector: selector,
            tagName: element.tagName,
            className: element.className,
            id: '', // Explicitly send empty string, never send ID
            text: textContent
          }, '*');
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
          if (hoverStyle && hoverStyle.parentNode) {
            hoverStyle.parentNode.removeChild(hoverStyle);
          }
          if (hoverTooltip && hoverTooltip.parentNode) {
            hoverTooltip.parentNode.removeChild(hoverTooltip);
          }
        });
        
        console.log('Preview with hover & click detection loaded - IDs are NEVER used in selectors');
      </script>
    `;

    // Insert script into HTML
    if (html.includes("</head>")) {
      return html.replace("</head>", clickScript + "</head>");
    } else if (html.includes("<body")) {
      const bodyIndex = html.indexOf("<body");
      return html.slice(0, bodyIndex) + "<head>" + clickScript + "</head>" + html.slice(bodyIndex);
    } else {
      return "<!DOCTYPE html><html><head>" + clickScript + "</head><body>" + html + "</body></html>";
    }
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "SELECTOR_SELECTED") {
        const selector = event.data.selector;
        setLastSelectedSelector(selector);
        if (selectedCallbackRef.current) {
          selectedCallbackRef.current(selector, {
            tagName: event.data.tagName,
            id: "", // Always empty string, never use ID
            className: event.data.className,
            text: event.data.text || "",
            attributes: []
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load HTML into iframe
  useEffect(() => {
    if (status === "success" && htmlContent && iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.srcdoc = htmlContent;
    }
  }, [status, htmlContent]);

  // -------------------------
  // UI RENDER
  // -------------------------

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-800">
      {/* Simple Header */}
      <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className="px-2 py-1 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'rgb(56, 149, 183)' }}
          >
            Interactive Preview
          </div>
        </div>
        <div className="text-gray-100 text-sm">
          Hover to highlight | Double Click to generate selector
        </div>
      </div>


      {/* Last Selected Display */}
      {lastSelectedSelector && (
        <div className="bg-gray-900 p-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-100 ml-2 text-sm">Selector:</span>
              <code className="bg-gray-800 px-2 py-1 rounded text-teal-200 font-mono text-sm">
                {lastSelectedSelector}
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(lastSelectedSelector)}
              className="text-xs text-black hover:text-teal-600 mr-2 py-1 rounded"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Content States */}
      {status === "idle" && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <Code size={48} className="mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold">Website Preview</h3>
          <p>Enter a URL to load the webpage.</p>
        </div>
      )}

      {status === "loading" && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <div className="animate-spin text-teal-500">
            <Code size={48} />
          </div>
          <p className="mt-4 font-semibold">Loading Website...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-4">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h3 className="text-lg font-bold">Preview Failed</h3>
          <p className="text-center mt-2 bg-red-900 bg-opacity-30 p-3 rounded-md">
            {errorMessage}
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            ref={iframeRef}
            title="Website Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
          />
        </div>
      )}
    </div>
  );
}