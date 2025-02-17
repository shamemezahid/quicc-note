"use client";

import {
  BrushIcon,
  DeleteIcon,
  EraserIcon,
  Palette,
  Trash2Icon,
  Undo2Icon,
  Redo2Icon,
  Download,
  Printer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;

export default function Home() {
  const canvasRef = useRef(null);
  const widthPickerRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush"); // brush or eraser
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(5);
  const [sharedText, setSharedText] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [activeTab, setActiveTab] = useState("canvas"); // 'canvas' or 'notepad'
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.9;
    canvas.height = (canvas.width * 9) / 16;
    const context = canvas.getContext("2d");
    setCtx(context);

    // Add this to initialize history with blank canvas
    if (context) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
      setHistoryIndex(0);
    }

    const initSocket = async () => {
      await fetch("/api/socket");
      socket = io();

      socket.on("connect", () => {
        setSocketReady(true);
      });

      socket.on("draw-line", drawLine);
      socket.on("text-update", (text) => setSharedText(text));
      socket.on("clear-canvas", clearCanvas);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        widthPickerRef.current &&
        !widthPickerRef.current.contains(event.target)
      ) {
        setShowWidthPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
  };

  const draw = (e) => {
    if (!isDrawing) return;
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
    if (socketReady) {
      socket.emit("draw-line", data);
    }

    ctx.lastX = x;
    ctx.lastY = y;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
    ctx.lastX = undefined;
    ctx.lastY = undefined;
  };

  const clearCanvas = () => {
    if (!ctx) return;
    saveToHistory();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleTextChange = (e) => {
    setSharedText(e.target.value);
    if (socketReady) {
      socket.emit("text-update", e.target.value);
    }
  };

  const saveToHistory = () => {
    if (!ctx) return;
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
              // font-family: system-ui, -apple-system, sans-serif;
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
    <div className="w-fit mx-auto flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-full flex gap-4 justify-between flex-wrap">
        <div className="flex gap-4 items-center">
          <h1 className="text-3xl font-extrabold">Quicc Notes</h1>
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
                      ? "bg-neutral-950 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <BrushIcon size={16} />
                </button>
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
                    if (socketReady) {
                      socket.emit("clear-canvas");
                    }
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
        className={
          `bg-white border border-gray-300 rounded-3xl` +
          (activeTab === "canvas" ? "" : " hidden")
        }
      />

      <textarea
        value={sharedText}
        onChange={handleTextChange}
        className={
          `w-[90vw] h-[90vh] border border-gray-300 rounded-3xl p-4` +
          (activeTab === "notepad" ? "" : " hidden")
        }
        placeholder="Type here to share text..."
      />
    </div>
  );
}
