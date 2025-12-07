import React, { useState, useEffect, useRef } from "react";
import { Code, AlertTriangle } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import API_BASE from "./api_base";

export default function ServerHtmlPreview({ url }) {
  const [status, setStatus] = useState("idle");
  const [htmlContent, setHtmlContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const iframeRef = useRef(null);
  const overlayRef = useRef(null);
  const selectedCallbackRef = useRef(null);
  const [renderedPageId, setRenderedPageId] = useState(null);
  // -------------------------
  // FETCH LOGIC (STATIC → JS)
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

    try {
      // ---- FIRST ATTEMPT: STATIC BACKEND ----
      let res = await fetch(`${API_BASE}/fetchcontent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ url: urlToFetch }),
      });

      let data = await res.json();

      const needsJS =
        !data.success ||
        (data.content &&
          (
            data.content.toLowerCase().includes("enable javascript") ||
            data.content.toLowerCase().includes("please enable javascript") ||
            data.content.toLowerCase().includes("javascript is disabled") ||
            data.content.trim().length < 50
          ));

      // ---- FALLBACK TO JS-RENDERED VERSION ----
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
      
        setRenderedPageId(data.page_id);

      }

      if (!data.success) throw new Error(data.error);

      setHtmlContent(data.content);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  };

  // -------------------------
  // ELEMENT HIGHLIGHT SYSTEM
  // -------------------------

  useEffect(() => {
    if (status !== "success") return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const overlay = overlayRef.current;

    if (!doc || !overlay) return;

    const highlight = (e) => {
      const el = e.target;
      const rect = el.getBoundingClientRect();

      overlay.style.display = "block";
      overlay.style.left = rect.left + iframe.offsetLeft + "px";
      overlay.style.top = rect.top + iframe.offsetTop + "px";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";
    };

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const selector = getCssSelector(e.target);
      console.log("SELECTOR PICKED:", selector);

      if (selectedCallbackRef.current) {
        selectedCallbackRef.current(selector);
      }
    };

    doc.addEventListener("mousemove", highlight);
    doc.addEventListener("click", handleClick);

    return () => {
      doc.removeEventListener("mousemove", highlight);
      doc.removeEventListener("click", handleClick);
    };
  }, [status]);


  // CSS SELECTOR GENERATOR
  const getCssSelector = (el) => {
    if (!el) return "";

    if (el.id) return `#${el.id}`;
    if (el.className) {
      const classSelector = "." + el.className.trim().replace(/\s+/g, ".");
      return `${el.tagName.toLowerCase()}${classSelector}`;
    }

    return el.tagName.toLowerCase();
  };

  // -------------------------
  // RENDER UI
  // -------------------------

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-800">

      {/* Overlay highlight */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          border: "2px solid #00e6b8",
          display: "none",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      ></div>

      {status === "idle" && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <Code size={48} className="mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold">HTML Source View</h3>
          <p>Enter a URL to load the webpage.</p>
        </div>
      )}

      {status === "loading" && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <div className="animate-spin text-teal-500">
            <Code size={48} />
          </div>
          <p className="mt-4 font-semibold">Loading Webpage...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-4">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h3 className="text-lg font-bold">Fetch Failed</h3>
          <p className="text-center mt-2 bg-red-900 bg-opacity-30 p-3 rounded-md">
            {errorMessage}
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="relative w-full h-full overflow-hidden">
         <iframe
            ref={iframeRef}
            src={`${API_BASE}/rendered/${renderedPageId}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups allow-modals"
            className="w-full h-full border-0"
        />


        </div>
      )}
    </div>
  );
}
