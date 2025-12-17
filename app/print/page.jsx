"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PrintContent() {
  const searchParams = useSearchParams();
  const content = searchParams.get("content") || "";
  const title = searchParams.get("title") || "Quicc Notes";

  useEffect(() => {
    // Trigger print dialog after page loads
    const timer = setTimeout(() => {
      window.print();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen p-16 print:p-0">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 print:mb-4 opacity-70">
          {title}
        </h1>
        <div className="whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-16">Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
