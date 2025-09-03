"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useSharedState } from "@airstate/react"

export default function Home() {
  const [sharedText, setSharedText] = useSharedState("");

  useEffect(() => {
    const savedText = localStorage.getItem("notepadText");
    if (savedText) setSharedText(savedText);
  }, []);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setSharedText(newText);
    localStorage.setItem("notepadText", newText);

    // Auto-expand textarea height without collapsing initial height
    const textarea = e.target;
    const minHeight = textarea.style.minHeight || "100%";
    textarea.style.height = minHeight;
    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      parseInt(minHeight)
    )}px`;
  };

  const printText = () => {
    const content = sharedText;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Quicc Notes - Print</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              padding: 2rem;
              white-space: pre-wrap;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-start p-4 sm:p-6 pt-0 sm:pt-0">
      <div className="w-full flex gap-4 justify-between flex-wrap py-4">
        <div className="flex gap-4 items-center w-full justify-between sm:w-fit">
          <h1 className="text-xl sm:text-3xl font-extrabold opacity-50">Quicc Notes</h1>
        </div>
        <div className="flex gap-4 items-center w-fit">
          <button
            title="Print Text"
            onClick={printText}
            className="p-3 bg-neutral-950 text-white rounded-2xl btn-animation"
          >
            <Printer size={16} className="stroke-white" />
          </button>
        </div>
      </div>

      <textarea
        value={sharedText}
        onChange={handleTextChange}
        className="w-full h-full border border-gray-300 rounded-xl p-4"
        placeholder="Type here to share text..."
      />
    </div>
  );
}