// SmartWebsitePreview.jsx - MODIFIED: Auto-copy on double-click + right-click context menu at cursor position
import React, { useState, useEffect, useRef } from "react";
import { Code, AlertTriangle, Copy, Eye, X } from "lucide-react";
import API_BASE from "./api_base";

export default function SmartWebsitePreview({ url, onSelectorSelected }) {
  const [status, setStatus] = useState("idle");
  const [htmlContent, setHtmlContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSelectedSelector, setLastSelectedSelector] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [currentElementInfo, setCurrentElementInfo] = useState(null);
  const iframeRef = useRef(null);
  const selectedCallbackRef = useRef(null);
  const contextMenuRef = useRef(null);
  const containerRef = useRef(null);

  // Set the callback for when a selector is selected
  useEffect(() => {
    selectedCallbackRef.current = onSelectorSelected;
  }, [onSelectorSelected]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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

      // Add enhanced click detection with auto-copy and right-click menu
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

  // Add click detection to HTML - MODIFIED: Auto-copy on double-click + right-click menu
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
          return selector;
        }
        
        // CSS escape helper
        function cssEscape(str) {
          if (!str) return '';
          return str.replace(/[!"#$%&'()*+,.\\/:;<=>?@[\\\\\\]^\`{|}~]/g, '\\\\$&');
        }
        
        // Copy text to clipboard
        async function copyToClipboard(text) {
          try {
            await navigator.clipboard.writeText(text);
            showNotification("✓ Selector copied: " + text, "success");
            return true;
          } catch (err) {
            console.error("Failed to copy:", err);
            showNotification("✗ Failed to copy to clipboard", "error");
            return false;
          }
        }
        
        // Show notification
        function showNotification(message, type = 'success') {
          const notification = document.createElement('div');
          notification.textContent = message;
          notification.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: \${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 1000000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease;
          \`;
          
          // Add animation style
          const style = document.createElement('style');
          style.textContent = \`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          \`;
          document.head.appendChild(style);
          
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
          }, 3000);
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
        
        // Right-click handler - Show custom context menu
        document.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const element = e.target;
          if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return;
          }
          
          // Remove hover
          element.classList.remove('preview-hover');
          
          // Hide tooltip
          if (hoverTooltip) {
            hoverTooltip.style.display = 'none';
          }
          
          // Generate selector
          const selector = generateSelector(element);
          
          // Get text content for preview
          let textContent = '';
          try {
            textContent = element.textContent ? element.textContent.trim().slice(0, 100) : '';
            if (element.textContent && element.textContent.trim().length > 100) {
              textContent += '...';
            }
          } catch (e) {
            textContent = '';
          }
          
          // Get element HTML preview
          let htmlPreview = '';
          try {
            const clone = element.cloneNode(true);
            if (clone.textContent) {
              const tempDiv = document.createElement('div');
              tempDiv.appendChild(clone);
              let html = tempDiv.innerHTML;
              htmlPreview = html.length > 150 ? html.substring(0, 150) + '...' : html;
            }
          } catch (e) {
            htmlPreview = '';
          }
          
          // Send context menu data to parent with EXACT mouse coordinates
          window.parent.postMessage({
            type: 'CONTEXT_MENU_REQUEST',
            selector: selector,
            tagName: element.tagName,
            className: element.className,
            text: textContent,
            htmlPreview: htmlPreview,
            mouseX: e.clientX,
            mouseY: e.clientY
          }, '*');
        });
        
        // Double Click handler - Auto-copy selector to clipboard
        document.addEventListener('dblclick', async function(e) {
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
          
          // Generate selector
          const selector = generateSelector(element);
          
          // AUTO-COPY ON DOUBLE CLICK
          await copyToClipboard(selector);
          
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
          
          // Send selector to parent
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
        
        console.log('Preview with hover & click detection loaded - Auto-copy on double-click, right-click menu available');
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
      } else if (event.data.type === "CONTEXT_MENU_REQUEST") {
        // Get iframe position to calculate correct coordinates
        if (iframeRef.current) {
          const iframeRect = iframeRef.current.getBoundingClientRect();
          
          // Calculate absolute position relative to viewport
          const absoluteX = iframeRect.left + event.data.mouseX;
          const absoluteY = iframeRect.top + event.data.mouseY;
          
          // Show custom context menu at exact click position
          setCurrentElementInfo({
            selector: event.data.selector,
            tagName: event.data.tagName,
            className: event.data.className,
            text: event.data.text,
            htmlPreview: event.data.htmlPreview
          });
          
          setContextMenuPosition({ 
            x: absoluteX, 
            y: absoluteY 
          });
          setShowContextMenu(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Handle copy selector from context menu
  const handleCopySelector = () => {
    if (currentElementInfo?.selector) {
      navigator.clipboard.writeText(currentElementInfo.selector);
      setShowContextMenu(false);
    }
  };

  // Handle preview in main app
  const handlePreview = () => {
    if (currentElementInfo && selectedCallbackRef.current) {
      selectedCallbackRef.current(currentElementInfo.selector, {
        tagName: currentElementInfo.tagName,
        id: "",
        className: currentElementInfo.className,
        text: currentElementInfo.text || "",
        attributes: []
      });
      setShowContextMenu(false);
    }
  };

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
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-gray-800">
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
        <div className="text-gray-100 text-sm flex gap-4">
          <span>Hover to highlight | <strong>Double-click to auto-copy</strong> | Right-click for menu</span>
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

      {/* Custom Context Menu - Positioned exactly at click location */}
      {showContextMenu && currentElementInfo && (
        <>
          {/* Backdrop to capture clicks */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />

          {/* Context Menu */}
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[200px] max-w-[240px]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              transform: 'translate(0, 0)', // Position exactly at click
            }}
          >
            {/* Minimal Header - Just close icon */}
            <div className="flex items-center justify-end p-1 border-b border-gray-700">
              <X
                size={16}
                onClick={() => setShowContextMenu(false)}
                className="cursor-pointer text-white opacity-70 hover:opacity-100"
                title="Close"
              />
            </div>

            {/* Preview Section - With text preview and selector */}
            <div className="p-3">
              {currentElementInfo.text && (
                <div className="text-xs text-gray-300 bg-gray-900 p-2 rounded mb-3">
                  <span className="text-gray-400 block mb-1">Text preview:</span>
                  <span className="text-gray-200">{currentElementInfo.text}</span>
                </div>
              )}
              <div className="text-xs mb-1 text-gray-400">Selector:</div>
              <code className="block text-teal-200 bg-gray-900 p-2 rounded font-mono text-[10px] break-all border border-gray-700">
                {currentElementInfo.selector}
              </code>
            </div>

            {/* Actions - Only Copy button */}
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={handleCopySelector}
                className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-700 rounded transition-colors"
              >
                <Copy size={14} className="text-gray-900" />
                Copy Selector
              </button>
            </div>
          </div>
        </>
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