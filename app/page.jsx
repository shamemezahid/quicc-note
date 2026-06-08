"use client";

import { Printer, Menu, MoreVertical, GripVertical, Download, Upload, Trash2 } from "lucide-react";
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

const IMPORT_ERROR_MESSAGE = "Improper formatting or wrong file uploaded";

const exportMonthNames = [
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

const formatExportFilename = (timestamp) => {
  const date = new Date(timestamp);
  const YYYY = date.getFullYear();
  const MMM = exportMonthNames[date.getMonth()];
  const DD = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  const SS = String(date.getSeconds()).padStart(2, "0");
  return `Quicc-Note-Export-${YYYY}-${MMM}-${DD}-${HH}-${MM}-${SS}.json`;
};

const downloadJsonFile = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
};

const normalizeImportedPage = (page, index) => {
  if (!page || typeof page !== "object" || Array.isArray(page)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  const createdDate =
    typeof page.createdDate === "number" && Number.isFinite(page.createdDate)
      ? page.createdDate
      : Date.now() + index;
  const lastEdited =
    typeof page.lastEdited === "number" && Number.isFinite(page.lastEdited)
      ? page.lastEdited
      : createdDate;
  const name =
    typeof page.name === "string" && page.name.trim()
      ? page.name.trim().slice(0, PAGE_NAME_LIMIT)
      : formatDefaultTitle(createdDate);

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    content: typeof page.content === "string" ? page.content : "",
    createdDate,
    lastEdited,
  };
};

const normalizeImportedPages = (pages) => {
  if (!Array.isArray(pages)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  return pages.map((page, index) => normalizeImportedPage(page, index));
};

const serializePagesForExport = (pages) =>
  Object.values(pages)
    .sort((left, right) => right.lastEdited - left.lastEdited)
    .map(({ id, name, content, createdDate, lastEdited }) => ({
      id,
      name,
      content,
      createdDate,
      lastEdited,
    }));

function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  showHeaderClose = true,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-[20px] font-semibold text-neutral-800">
              {title}
            </h2>
            {description ? (
              <p className="text-sm font-normal leading-6 text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>
          {showHeaderClose ? (
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              Close
            </button>
          ) : null}
        </div>

        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

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
    <ModalShell
      title="Delete this page?"
      description="This action will remove the page from your local browser storage."
      onClose={() => setDeleteConfirmPageId(null)}
    >
      <div className="flex gap-2 justify-end">
          <button
            onClick={() => setDeleteConfirmPageId(null)}
            className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={() => deletePage(deleteConfirmPageId)}
            className="px-4 py-2 rounded-xl bg-neutral-950 text-white transition-opacity hover:opacity-90"
          >
            Delete
          </button>
      </div>
    </ModalShell>
  );
}

function ExportDataModal({ onClose, onExport }) {
  return (
    <ModalShell
      title="Export Data"
      description="All your notes are saved securely and locally in your browser. You can export them as a JSON file for backup or import them in another computer or browser."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Close
          </button>
          <button
            onClick={onExport}
            className="rounded-xl bg-neutral-950 px-4 py-2 text-sm text-white btn-animation"
          >
            Export
          </button>
        </div>
      }
    />
  );
}

function ImportDataModal({
  onClose,
  onChooseFile,
  onImport,
  importInputRef,
  selectedFileName,
  importError,
}) {
  return (
    <ModalShell
      title="Import Data"
      description="You can import your previously exported notes into this browser. Or, make your own JSON archive and import it. Please keep in mind this importing tool doesn't check for duplicates."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Close
          </button>
          <button
            onClick={onImport}
            disabled={!selectedFileName}
            className="rounded-xl bg-neutral-950 px-4 py-2 text-sm text-white btn-animation disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import
          </button>
        </div>
      }
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={onChooseFile}
        className="hidden"
      />
      <div className="space-y-3">
        <button
          onClick={() => importInputRef.current?.click()}
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          Choose JSON File
        </button>
        <div className="text-sm text-neutral-500">
          {selectedFileName ? (
            <span>{selectedFileName}</span>
          ) : (
            <span>No file selected</span>
          )}
        </div>
        {importError ? (
          <p className="text-sm text-red-600">{importError}</p>
        ) : null}
      </div>
    </ModalShell>
  );
}

function DeleteAllDataModal({ onClose }) {
  return (
    <ModalShell
      title="Delete all data"
      description="Don't worry, you can't actually delete all your data from the app. To actually delete all your data, Go to the devtools of your browser, and clear all data."
      onClose={onClose}
      showHeaderClose={false}
      footer={
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-950 px-4 py-2 text-sm text-white btn-animation"
          >
            Close
          </button>
        </div>
      }
    />
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
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [menuOpenPageId, setMenuOpenPageId] = useState(null);
  const [deleteConfirmPageId, setDeleteConfirmPageId] = useState(null);

  const editInputRef = useRef(null);
  const topBarInputRef = useRef(null);
  const importInputRef = useRef(null);
  const dataMenuRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [editingTopBarTitle, setEditingTopBarTitle] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [dataModalType, setDataModalType] = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState("");

  // Sidebar resize drag handlers
  const onDragStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (e) => {
      const newWidth = Math.min(Math.max(e.clientX, 200), window.innerWidth * 0.3);
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

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

  useEffect(() => {
    if (!dataMenuOpen) return;

    const handlePointerDown = (event) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setDataMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDataMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dataMenuOpen]);

  // Save pages to localStorage
  const savePages = (updatedPages) => {
    localStorage.setItem("quicc_notes_data", JSON.stringify(updatedPages));
    setPages(updatedPages);
  };

  const closeDataModal = () => {
    setDataModalType(null);
    setImportFile(null);
    setImportFileName("");
    setImportError("");
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  const openDataModal = (type) => {
    setMenuOpenPageId(null);
    setDataMenuOpen(false);
    setDataModalType(type);
    setImportError("");

    if (type !== "import") {
      setImportFile(null);
      setImportFileName("");
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const exportPages = () => {
    const exportData = serializePagesForExport(pages);
    downloadJsonFile(formatExportFilename(Date.now()), exportData);
    closeDataModal();
  };

  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImportFile(null);
      setImportFileName("");
      setImportError("");
      return;
    }

    setImportFile(file);
    setImportFileName(file.name);
    setImportError("");
  };

  const handleImportData = async () => {
    try {
      if (!importFile) {
        throw new Error(IMPORT_ERROR_MESSAGE);
      }

      if (!importFile.name.toLowerCase().endsWith(".json")) {
        throw new Error(IMPORT_ERROR_MESSAGE);
      }

      const rawText = await importFile.text();
      const parsedData = JSON.parse(rawText);
      const normalizedImportedPages = normalizeImportedPages(parsedData);
      const importedPagesMap = normalizedImportedPages.reduce(
        (accumulator, page) => {
          accumulator[page.id] = page;
          return accumulator;
        },
        {}
      );

      const updatedPages = {
        ...pages,
        ...importedPagesMap,
      };

      savePages(updatedPages);

      if (!currentPageId && normalizedImportedPages[0]) {
        setCurrentPageId(normalizedImportedPages[0].id);
      }

      closeDataModal();
    } catch (error) {
      console.error(error);
      setImportError(IMPORT_ERROR_MESSAGE);
    }
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
    const title = currentPage ? currentPage.name : "Quicc Notes";
    
    // Navigate to print route with content
    const params = new URLSearchParams({
      content,
      title
    });
    window.open(`/print?${params.toString()}`, "_blank");
  };

  return (
    <>
    <div className="w-full h-screen flex flex-row items-start justify-start p-4 gap-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        <DeleteConfirmModal
          deleteConfirmPageId={deleteConfirmPageId}
          setDeleteConfirmPageId={setDeleteConfirmPageId}
          deletePage={deletePage}
        />

        {/* Top Bar */}
        <div className="w-full flex gap-4 justify-between pb-3">
          <div className={`flex gap-2 items-center w-full justify-between ${editingTopBarTitle ? "" : "sm:w-fit"}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              <Menu size={20} />
            </button>
            {editingTopBarTitle && currentPageId ? (
              <input
                ref={topBarInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingName.trim()) {
                      const trimmedName = editingName.trim().slice(0, PAGE_NAME_LIMIT);
                      const updatedPages = {
                        ...pages,
                        [currentPageId]: {
                          ...pages[currentPageId],
                          name: trimmedName,
                          lastEdited: Date.now(),
                        },
                      };
                      savePages(updatedPages);
                    }
                    setEditingTopBarTitle(false);
                    setEditingName("");
                  }
                  if (e.key === "Escape") {
                    setEditingTopBarTitle(false);
                    setEditingName("");
                  }
                }}
                onBlur={() => {
                  setEditingTopBarTitle(false);
                  setEditingName("");
                }}
                maxLength={PAGE_NAME_LIMIT}
                className="text-base sm:text-lg font-bold bg-transparent border-b border-gray-400 outline-none w-full"
              />
            ) : (
              <h1
                onDoubleClick={() => {
                  if (currentPageId) {
                    setEditingName(pages[currentPageId].name);
                    setEditingTopBarTitle(true);
                    setTimeout(() => topBarInputRef.current?.focus(), 0);
                  }
                }}
                className="text-base sm:text-lg font-bold opacity-50 line-clamp-1 cursor-default"
              >
                {currentPage ? truncateName(currentPage.name) : "Quicc Notes"}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2 w-fit">
            <button
              title="Print Text"
              onClick={printText}
              className="p-3 bg-neutral-950 text-white rounded-2xl btn-animation"
            >
              <Printer size={16} className="stroke-white" />
            </button>

            <div ref={dataMenuRef} className="relative">
              <button
                title="More actions"
                aria-haspopup="menu"
                aria-expanded={dataMenuOpen}
                onClick={() => setDataMenuOpen((open) => !open)}
                className="p-3 rounded-2xl border border-neutral-200 bg-white text-neutral-900 btn-animation hover:bg-neutral-50"
              >
                <MoreVertical size={16} className="stroke-neutral-900" />
              </button>

              {dataMenuOpen ? (
                <div className="absolute right-0 mt-2 min-w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl z-30">
                  <button
                    onClick={() => openDataModal("export")}
                    className="flex items-center w-full px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Download size={16} className="stroke-neutral-400 mr-3" />
                    <span>Export Data</span>
                  </button>
                  <button
                    onClick={() => openDataModal("import")}
                    className="flex items-center w-full px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Upload size={16} className="stroke-neutral-400 mr-3" />
                    <span>Import Data</span>
                  </button>
                  <button
                    onClick={() => openDataModal("delete-all")}
                    className="flex items-center w-full px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Trash2 size={16} className="stroke-neutral-400 mr-3" />
                    <span>Delete all data</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`h-full w-full grid ${isResizing ? "" : "transition-[grid-template-columns,gap] duration-300 ease-in-out"}`}
          style={{ gridTemplateColumns: sidebarOpen ? `${sidebarWidth}px 1rem 1fr` : "0px 0px 1fr" }}
        >
          {/* Sidebar */}
            <div
              className="h-full min-w-0 overflow-hidden"
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

          {/* Drag handle */}
          <div
            onPointerDown={onDragStart}
            onDoubleClick={() => setSidebarWidth(200)}
            className="h-full cursor-col-resize flex items-center justify-center group"
          >
            <GripVertical
              size={12}
              className="text-gray-300 group-hover:text-gray-400 transition-colors"
            />
          </div>

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

    {dataModalType === "export" ? (
      <ExportDataModal onClose={closeDataModal} onExport={exportPages} />
    ) : null}

    {dataModalType === "import" ? (
      <ImportDataModal
        onClose={closeDataModal}
        onChooseFile={handleImportFileChange}
        onImport={handleImportData}
        importInputRef={importInputRef}
        selectedFileName={importFileName}
        importError={importError}
      />
    ) : null}

    {dataModalType === "delete-all" ? (
      <DeleteAllDataModal onClose={closeDataModal} />
    ) : null}
    </>
  );
}
