"use client";

import { Printer, Menu, MoreVertical } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const MAX_PAGES = Math.pow(2, 12); // 4096 pages
const PAGE_NAME_LIMIT = 100;
const DISPLAY_NAME_LIMIT = 30;

// Format default title
const formatDefaultTitle = (timestamp) => {
  const date = new Date(timestamp);
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  const SS = String(date.getSeconds()).padStart(2, "0");
  const YYYY = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  return `Untitled ${HH}:${MM}:${SS}, ${YYYY}-${month}-${DD}`;
};

// Format date for tooltip
const formatTooltipDate = (timestamp) => {
  const date = new Date(timestamp);
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const Mon = months[date.getMonth()];
  const DD = String(date.getDate()).padStart(2, "0");
  const YYYY = date.getFullYear();
  return `${HH}:${MM}, ${Mon} ${DD}, ${YYYY}`;
};

// Truncate display name
const truncateName = (name) => {
  if (name.length <= DISPLAY_NAME_LIMIT) return name;
  return name.slice(0, DISPLAY_NAME_LIMIT) + "...";
};

// Sidebar Component
function Sidebar({ 
  sidebarOpen, 
  pages, 
  currentPageId, 
  editingPageId, 
  editingName, 
  menuOpenPageId,
  editInputRef,
  createNewPage,
  getSortedPageIds,
  setCurrentPageId,
  setSidebarOpen,
  startEditingPage,
  setEditingName,
  savePageName,
  cancelEditing,
  setMenuOpenPageId,
  setDeleteConfirmPageId
}) {
  if (!sidebarOpen) return null;

  return (
    <div
      className="h-full bg-white border border-gray-300 rounded-xl transition-all duration-300 ease-in-out flex-shrink-0"
      style={{ width: "200px" }}
    >
      <div className="flex flex-col h-full p-4">
        {/* New Page Button */}
        <button
          onClick={createNewPage}
          className="font-bold text-left mb-4 p-2 hover:bg-gray-100 rounded"
        >
          New Page
        </button>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto">
          {getSortedPageIds().map((pageId) => (
            <PageItem
              key={pageId}
              pageId={pageId}
              page={pages[pageId]}
              isEditing={editingPageId === pageId}
              isCurrent={currentPageId === pageId}
              isMenuOpen={menuOpenPageId === pageId}
              editingName={editingName}
              editInputRef={editInputRef}
              setCurrentPageId={setCurrentPageId}
              setSidebarOpen={setSidebarOpen}
              startEditingPage={startEditingPage}
              setEditingName={setEditingName}
              savePageName={savePageName}
              cancelEditing={cancelEditing}
              setMenuOpenPageId={setMenuOpenPageId}
              setDeleteConfirmPageId={setDeleteConfirmPageId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Page Item Component
function PageItem({
  pageId,
  page,
  isEditing,
  isCurrent,
  isMenuOpen,
  editingName,
  editInputRef,
  setCurrentPageId,
  setSidebarOpen,
  startEditingPage,
  setEditingName,
  savePageName,
  cancelEditing,
  setMenuOpenPageId,
  setDeleteConfirmPageId
}) {
  if (isEditing) {
    return (
      <div className="p-2 mb-1">
        <input
          ref={editInputRef}
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") savePageName();
            if (e.key === "Escape") cancelEditing();
          }}
          maxLength={PAGE_NAME_LIMIT}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={savePageName}
            className="px-3 py-1 bg-black text-white text-xs rounded"
          >
            Done
          </button>
          <button
            onClick={cancelEditing}
            className="px-3 py-1 bg-black text-white text-xs rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group mb-1">
      <div className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
        <button
          onClick={() => {
            setCurrentPageId(pageId);
            setSidebarOpen(false);
          }}
          onDoubleClick={() => startEditingPage(pageId)}
          title={`Created: ${formatTooltipDate(page.createdDate)}\nUpdated: ${formatTooltipDate(page.lastEdited)}`}
          className={`flex-1 text-left text-sm truncate ${
            isCurrent ? "font-bold" : ""
          }`}
        >
          {truncateName(page.name)}
        </button>
        
        {/* Meatball menu */}
        <div className="relative opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setMenuOpenPageId(isMenuOpen ? null : pageId)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <MoreVertical size={14} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[100px]">
              <button
                onClick={() => startEditingPage(pageId)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Rename
              </button>
              <button
                onClick={() => setDeleteConfirmPageId(pageId)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ deleteConfirmPageId, setDeleteConfirmPageId, deletePage }) {
  if (!deleteConfirmPageId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-sm">
        <p className="mb-4">Are you sure you want to delete this page?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setDeleteConfirmPageId(null)}
            className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => deletePage(deleteConfirmPageId)}
            className="px-4 py-2 bg-white text-red-600 border border-gray-300 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Top Bar Component
function TopBar({ sidebarOpen, setSidebarOpen, currentPage, printText }) {
  return (
    <div className="w-full flex gap-3 items-center py-4">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 hover:bg-gray-100 rounded-xl flex-shrink-0"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-lg sm:text-2xl font-bold opacity-50 flex-1 truncate">
        {currentPage ? truncateName(currentPage.name) : "Quicc Notes"}
      </h1>
      <button
        title="Print Text"
        onClick={printText}
        className="p-3 bg-neutral-950 text-white rounded-2xl btn-animation flex-shrink-0"
      >
        <Printer size={16} className="stroke-white" />
      </button>
    </div>
  );
}

export default function Home() {
  const [pages, setPages] = useState({});
  const [currentPageId, setCurrentPageId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [menuOpenPageId, setMenuOpenPageId] = useState(null);
  const [deleteConfirmPageId, setDeleteConfirmPageId] = useState(null);

  const editInputRef = useRef(null);

  // Initialize pages from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("quicc_notes_data");

    if (savedData) {
      const parsedPages = JSON.parse(savedData);
      setPages(parsedPages);

      // Set most recently edited page as current
      const sortedIds = Object.keys(parsedPages).sort(
        (a, b) => parsedPages[b].lastEdited - parsedPages[a].lastEdited
      );
      if (sortedIds.length > 0) {
        setCurrentPageId(sortedIds[0]);
      }
    } else {
      // Check for old localStorage format and migrate
      const oldText = localStorage.getItem("notepadText");
      if (oldText) {
        const timestamp = Date.now();
        const newPage = {
          id: timestamp.toString(),
          name: formatDefaultTitle(timestamp),
          content: oldText,
          createdDate: timestamp,
          lastEdited: timestamp,
        };
        const newPages = { [newPage.id]: newPage };
        setPages(newPages);
        setCurrentPageId(newPage.id);
        localStorage.setItem("quicc_notes_data", JSON.stringify(newPages));
        localStorage.removeItem("notepadText");
      }
    }
  }, []);

  // Save pages to localStorage
  const savePages = (updatedPages) => {
    localStorage.setItem("quicc_notes_data", JSON.stringify(updatedPages));
    setPages(updatedPages);
  };

  // Create new page
  const createNewPage = () => {
    if (Object.keys(pages).length >= MAX_PAGES) {
      alert(`Maximum ${MAX_PAGES} pages allowed`);
      return;
    }

    const timestamp = Date.now();
    const newPage = {
      id: timestamp.toString(),
      name: formatDefaultTitle(timestamp),
      content: "",
      createdDate: timestamp,
      lastEdited: timestamp,
    };

    const updatedPages = { ...pages, [newPage.id]: newPage };
    savePages(updatedPages);
    setCurrentPageId(newPage.id);
  };

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value;

    // If no current page and user starts typing, create one
    if (!currentPageId && newText.length > 0) {
      const timestamp = Date.now();
      const newPage = {
        id: timestamp.toString(),
        name: formatDefaultTitle(timestamp),
        content: newText,
        createdDate: timestamp,
        lastEdited: timestamp,
      };
      const updatedPages = { ...pages, [newPage.id]: newPage };
      savePages(updatedPages);
      setCurrentPageId(newPage.id);
    } else if (currentPageId) {
      // Update existing page
      const updatedPages = {
        ...pages,
        [currentPageId]: {
          ...pages[currentPageId],
          content: newText,
          lastEdited: Date.now(),
        },
      };
      savePages(updatedPages);
    }

    // Auto-expand textarea height
    const textarea = e.target;
    const minHeight = textarea.style.minHeight || "100%";
    textarea.style.height = minHeight;
    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      parseInt(minHeight)
    )}px`;
  };

  // Start editing page name
  const startEditingPage = (pageId) => {
    setEditingPageId(pageId);
    setEditingName(pages[pageId].name);
    setMenuOpenPageId(null);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Save edited page name
  const savePageName = () => {
    if (editingPageId && editingName.trim()) {
      const trimmedName = editingName.trim().slice(0, PAGE_NAME_LIMIT);
      const updatedPages = {
        ...pages,
        [editingPageId]: {
          ...pages[editingPageId],
          name: trimmedName,
          lastEdited: Date.now(),
        },
      };
      savePages(updatedPages);
    }
    setEditingPageId(null);
    setEditingName("");
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingPageId(null);
    setEditingName("");
  };

  // Delete page
  const deletePage = (pageId) => {
    const updatedPages = { ...pages };
    delete updatedPages[pageId];
    savePages(updatedPages);

    // If deleted page was current, select first remaining or set to null
    if (currentPageId === pageId) {
      const remainingIds = Object.keys(updatedPages);
      if (remainingIds.length > 0) {
        // Sort and select most recently edited
        const sortedIds = remainingIds.sort(
          (a, b) => updatedPages[b].lastEdited - updatedPages[a].lastEdited
        );
        setCurrentPageId(sortedIds[0]);
      } else {
        setCurrentPageId(null);
      }
    }

    setDeleteConfirmPageId(null);
    setMenuOpenPageId(null);
  };

  // Get sorted page IDs
  const getSortedPageIds = () => {
    return Object.keys(pages).sort(
      (a, b) => pages[b].lastEdited - pages[a].lastEdited
    );
  };

  const currentPage = currentPageId ? pages[currentPageId] : null;

  const printText = () => {
    const content = currentPage ? currentPage.content : "";
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
    <div className="w-full h-screen flex flex-row items-start justify-start p-4 pt-2 sm:p-6 sm:pt-2 gap-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Delete Confirmation Modal */}
        {deleteConfirmPageId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl max-w-sm">
              <p className="mb-4">Are you sure you want to delete this page?</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirmPageId(null)}
                  className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePage(deleteConfirmPageId)}
                  className="px-4 py-2 bg-white text-red-600 border border-gray-300 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="w-full flex gap-4 justify-between py-4">
          <div className="flex gap-2 items-center w-full justify-between sm:w-fit">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-bold opacity-50 line-clamp-1">
              {currentPage ? truncateName(currentPage.name) : "Quicc Notes"}
            </h1>
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

        <div className="flex gap-4 h-full w-full">
          {/* Sidebar */}
          {sidebarOpen && (
            <div
              className="h-full transition-all duration-300 ease-in-out flex-shrink-0"
              style={{ width: "200px"}}
            >
              <div className="flex flex-col h-full">
                {/* New Page Button */}
                <button
                  onClick={createNewPage}
                  className="font-medium text-left mb-3 p-4 hover:bg-gray-100  bg-white border border-gray-300 rounded-xl overflow-hidden"
                >
                  + New page
                </button>

                {/* Pages List */}
                <div className="flex-1 overflow-y-auto  bg-white border border-gray-300 rounded-xl">
                  {getSortedPageIds().map((pageId) => (
                    <div key={pageId} className="relative group">
                      {editingPageId === pageId ? (
                        // Editing mode
                        <div className="p-3">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePageName();
                              if (e.key === "Escape") cancelEditing();
                            }}
                            maxLength={PAGE_NAME_LIMIT}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={savePageName}
                              className="px-3 py-1 bg-black text-white text-xs rounded"
                            >
                              Done
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 bg-black text-white text-xs rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-center justify-between p-3 hover:bg-gray-100 rounded">
                          <button
                            onClick={() => {
                              setCurrentPageId(pageId);
                              setSidebarOpen(false);
                            }}
                            onDoubleClick={() => startEditingPage(pageId)}
                            title={`Created: ${formatTooltipDate(
                              pages[pageId].createdDate
                            )}\nUpdated: ${formatTooltipDate(
                              pages[pageId].lastEdited
                            )}`}
                            className={`flex-1 text-left text-sm truncate ${
                              currentPageId === pageId ? "font-bold" : ""
                            }`}
                          >
                            {truncateName(pages[pageId].name)}
                          </button>

                          {/* Meatball menu */}
                          <div className="relative opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() =>
                                setMenuOpenPageId(
                                  menuOpenPageId === pageId ? null : pageId
                                )
                              }
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <MoreVertical size={14} />
                            </button>

                            {menuOpenPageId === pageId && (
                              <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 min-w-[100px]">
                                <button
                                  onClick={() => startEditingPage(pageId)}
                                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmPageId(pageId)}
                                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={currentPage ? currentPage.content : ""}
            onChange={handleTextChange}
            className="w-full h-full border border-gray-300 rounded-xl p-4 flex-1"
            placeholder="Type here to share text..."
          />
        </div>
      </div>
    </div>
  );
}
