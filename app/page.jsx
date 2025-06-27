"use client";

import {
  BrushIcon,
  EraserIcon,
  Palette,
  Trash2Icon,
  Undo2Icon,
  Redo2Icon,
  Download,
  Printer,
  DeleteIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;

export default function Home() {
  const canvasRef = useRef(null);
  const widthPickerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(5);
  const [sharedText, setSharedText] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [activeTab, setActiveTab] = useState("canvas");
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Function to determine if a color is light or dark
  const isLightColor = (hexColor) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  // Flood fill algorithm to erase connected shapes
  const floodFillErase = (startX, startY) => {
    if (!ctx) return;
    
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    
    // Scale coordinates for high-DPI displays
    const scaledX = Math.floor(startX * dpr);
    const scaledY = Math.floor(startY * dpr);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    
    // Check if coordinates are within bounds
    if (scaledX < 0 || scaledX >= width || scaledY < 0 || scaledY >= height) return;
    
    const startIndex = getPixelIndex(scaledX, scaledY);
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];
    
    // Don't erase if clicking on white background (255, 255, 255, 255)
    if (startR === 255 && startG === 255 && startB === 255 && startA === 255) return;
    
    const stack = [[scaledX, scaledY]];
    const visited = new Set();
    
    // More tolerant color matching to handle anti-aliasing
    const isSimilarColor = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const index = getPixelIndex(x, y);
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      
      // Skip pure white background
      if (r === 255 && g === 255 && b === 255 && a === 255) return false;
      
      // For anti-aliased edges, check if it's a similar color or semi-transparent
      const colorThreshold = 100; // Increased tolerance for color difference
      const rDiff = Math.abs(r - startR);
      const gDiff = Math.abs(g - startG);
      const bDiff = Math.abs(b - startB);
      
      // Match if colors are similar OR if it's a semi-transparent pixel (likely an edge)
      // OR if it's any non-white pixel (more aggressive)
      return (rDiff <= colorThreshold && gDiff <= colorThreshold && bDiff <= colorThreshold) || 
             (a < 255 && a > 0) ||
             !(r === 255 && g === 255 && b === 255);
    };
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      
      if (visited.has(`${x},${y}`)) continue;
      if (!isSimilarColor(x, y)) continue;
      
      visited.add(`${x},${y}`);
      
      // Set pixel to white (erase)
      const index = getPixelIndex(x, y);
      data[index] = 255;     // R
      data[index + 1] = 255; // G
      data[index + 2] = 255; // B
      data[index + 3] = 255; // A
      
      // Add adjacent pixels to stack (4-directional)
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set the actual canvas size based on device pixel ratio
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale the canvas back down using CSS
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const context = canvas.getContext("2d");
      // Scale the drawing context so everything draws at the correct size
      context.scale(dpr, dpr);
      setCtx(context);
    }

    const initSocket = async () => {
      await fetch("/api/socket");
      socket = io();

      socket.on("connect", () => setSocketReady(true));
      socket.on("draw-line", drawLine);
      socket.on("text-update", (text) => setSharedText(text));
      socket.on("clear-canvas", clearCanvas);
      socket.on("object-erase", (data) => floodFillErase(data.x, data.y));
    };

    initSocket();

    return () => socket?.disconnect();
  }, []);

  useEffect(() => {
    const savedText = localStorage.getItem("notepadText");
    if (savedText) setSharedText(savedText);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        widthPickerRef.current &&
        !widthPickerRef.current.contains(event.target)
      ) {
        setShowWidthPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }, [ctx]);

  const drawLine = (data) => {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(data.from.x, data.from.y);
    ctx.lineTo(data.to.x, data.to.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === "objectEraser") {
      saveToHistory();
      floodFillErase(x, y);
      if (socketReady) socket.emit("object-erase", { x, y });
      return;
    }
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
  };

  const draw = (e) => {
    if (!isDrawing || tool === "objectEraser") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const data = {
      from: {
        x: ctx.lastX || x,
        y: ctx.lastY || y,
      },
      to: { x, y },
      color: tool === "eraser" ? "#ffffff" : color,
      width,
    };

    drawLine(data);
    if (socketReady) socket.emit("draw-line", data);

    ctx.lastX = x;
    ctx.lastY = y;
  };

  const stopDrawing = () => {
    if (isDrawing) saveToHistory();
    setIsDrawing(false);
    ctx.lastX = undefined;
    ctx.lastY = undefined;
  };

  const clearCanvas = () => {
    if (!ctx) return;
    saveToHistory();
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
    localStorage.removeItem("canvasData");
  };

  const saveTextToLocalStorage = (text) => {
    localStorage.setItem("notepadText", text);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setSharedText(newText);
    saveTextToLocalStorage(newText);
    if (socketReady) socket.emit("text-update", newText);

    // Auto-expand textarea height without collapsing initial height
    const textarea = e.target;
    const minHeight = textarea.style.minHeight || "100%";
    textarea.style.height = minHeight;
    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      parseInt(minHeight)
    )}px`;
  };

  const saveToHistory = () => {
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const imageData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const exportToPNG = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "canvas-drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
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
          <div className="flex flex-nowrap">
            <button
              title="Switch to Canvas"
              onClick={() => setActiveTab("canvas")}
              className={`p-3 rounded-2xl text-lg btn-animation ${
                activeTab === "canvas"
                  ? "text-neutral-800 font-black"
                  : "text-gray-500"
              }`}
            >
              Canvas
            </button>
            <button
              title="Switch to Notepad"
              onClick={() => setActiveTab("notepad")}
              className={`p-3 rounded-2xl text-lg btn-animation ${
                activeTab === "notepad"
                  ? "text-neutral-800 font-black"
                  : "text-gray-500"
              }`}
            >
              Notepad
            </button>
          </div>

          </div>
        <div className="flex gap-4 items-center w-fit">
          {activeTab === "notepad" ? (
            <button
              title="Print Text"
              onClick={printText}
              className="p-3 bg-neutral-950 text-white rounded-2xl btn-animation"
            >
              <Printer size={16} className="stroke-white" />
            </button>
          ) : (
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <button
                  title="Brush Tool"
                  onClick={() => setTool("brush")}
                  className={`p-3 rounded-2xl btn-animation ${
                    tool === "brush"
                      ? (isLightColor(color) ? "text-black" : "text-white")
                      : "text-gray-700"
                  }`}
                  style={{
                    backgroundColor: tool === "brush" ? color : "#e5e7eb"
                  }}
                >
                  <BrushIcon size={16} />
                </button>
                <div
                  title="Pick Color"
                  className="relative p-3 rounded-2xl flex gap-3 items-center outline outline-8 -outline-offset-8 bg-gray-200"
                  style={{ outlineColor: color }}
                >
                  <Palette size={16} />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ appearance: "none", border: "none" }}
                    className="absolute inset-0 h-8 w-8 opacity-0 rounded"
                  />
                </div>
                <button
                  title="Eraser Tool"
                  onClick={() => setTool("eraser")}
                  className={`p-3 rounded-2xl btn-animation ${
                    tool === "eraser"
                      ? "bg-neutral-950 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <EraserIcon size={16} />
                </button>
                <button
                  title="Object Eraser Tool"
                  onClick={() => setTool("objectEraser")}
                  className={`p-3 rounded-2xl btn-animation ${
                    tool === "objectEraser"
                      ? "bg-neutral-950 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <DeleteIcon size={16} />
                </button>
                <div className="relative" ref={widthPickerRef}>
                  <button
                    title="Adjust Brush Size"
                    onClick={() => setShowWidthPicker(!showWidthPicker)}
                    className={`w-10 h-10 flex items-center justify-center p-3 rounded-2xl bg-gray-200 text-gray-700 font-medium btn-animation`}
                  >
                    {width}
                  </button>

                  {showWidthPicker && (
                    <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-2xl shadow-lg border border-gray-200 z-10">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={width}
                        onChange={(e) => setWidth(parseInt(e.target.value))}
                        className="w-32"
                      />
                      <div className="text-center mt-1 text-sm text-gray-600">
                        Stroke Width: <strong>{width}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <button
                  title="Undo"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className={`p-3 rounded-2xl btn-animation ${
                    historyIndex <= 0
                      ? "bg-gray-100 text-gray-400"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <Undo2Icon size={16} />
                </button>
                <button
                  title="Redo"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-3 rounded-2xl btn-animation ${
                    historyIndex >= history.length - 1
                      ? "bg-gray-100 text-gray-400"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <Redo2Icon size={16} />
                </button>
                <button
                  title="Export as PNG"
                  onClick={exportToPNG}
                  className="p-3 bg-neutral-950 text-white rounded-2xl btn-animation"
                >
                  <Download size={16} className="stroke-white" />
                </button>
                <button
                  title="Clear Canvas"
                  onClick={() => {
                    clearCanvas();
                    if (socketReady) socket.emit("clear-canvas");
                  }}
                  className="p-3 bg-red-500 text-white rounded-2xl btn-animation"
                >
                  <Trash2Icon size={16} className="stroke-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        className={`w-full h-full border border-gray-300 rounded-xl ${
          activeTab === "canvas" ? "block" : "hidden"
        }`}
        style={{ 
          width: "100%", 
          height: "100%"
        }}
      />

      <textarea
        value={sharedText}
        onChange={handleTextChange}
        className={`w-full h-full border border-gray-300 rounded-xl p-4 ${
          activeTab === "notepad" ? "block" : "hidden"
        }`}
        placeholder="Type here to share text..."
      />
    </div>
  );
}
