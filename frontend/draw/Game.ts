import { getExistingShapes } from "./http";

export type Tool =
  | "pencil"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "diamond"
  | "text"
  | "eraser"
  | "move";

export type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      lineWidth: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radiusX: number;
      radiusY: number;
      color: string;
      lineWidth: number;
    }
  | {
      type: "pencil";
      points: { x: number; y: number }[];
      color: string;
      lineWidth: number;
    }
  | {
      type: "line";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string;
      lineWidth: number;
    }
  | {
      type: "arrow";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string;
      lineWidth: number;
    }
  | {
      type: "diamond";
      centerX: number;
      centerY: number;
      width: number;
      height: number;
      color: string;
      lineWidth: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
    }
  | {
      type: "move";
      shape: Shape;
      offsetX: number;
      offsetY: number;
    }
  | {
      type: "eraser";
      points: { x: number; y: number }[];
      radius: number;
    };

// Utility function to calculate minimum distance from a point (px, py) to line segment (vx, vy)-(wx, wy)
function distToSegment(
  px: number,
  py: number,
  vx: number,
  vy: number,
  wx: number,
  wy: number
): number {
  const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
  if (l2 === 0) return Math.hypot(px - vx, py - vy);
  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = vx + t * (wx - vx);
  const projY = vy + t * (wy - vy);
  return Math.hypot(px - projX, py - projY);
}

export class Game {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[] = [];
  private roomId: string;
  private clicked: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private selectedTool: Tool = "pencil";
  private currentPencilStroke: { x: number; y: number }[] = [];
  private activeShape: Shape | null = null;
  private currentMouseX: number = 0;
  private currentMouseY: number = 0;
  private currentColor: string = "black";
  private currentLineWidth: number = 2;
  private currentFontSize: number = 20;

  private scale: number = 1;
  private minScale: number = 0.1;
  private maxScale: number = 5;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

  // Eraser state & network batching
  private hasErasedInCurrentDrag: boolean = false;
  private activeTextArea: HTMLTextAreaElement | null = null;

  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.roomId = roomId;
    this.socket = socket;
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
    this.initZoomHandlers();
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    this.socket.removeEventListener("message", this.socketMessageHandler);
    this.cleanupActiveTextArea();
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
    this.cleanupActiveTextArea();
    if (tool === "move") {
      this.canvas.style.cursor = "move";
    } else if (tool === "text") {
      this.canvas.style.cursor = "text";
    } else if (tool === "eraser") {
      this.canvas.style.cursor = "crosshair";
    } else {
      this.canvas.style.cursor = "crosshair";
    }
  }

  setColor(color: string) {
    this.currentColor = color;
    this.redrawCanvas();
  }

  setLineWidth(lineWidth: number) {
    this.currentLineWidth = lineWidth;
    this.redrawCanvas();
  }

  setFontSize(fontSize: number) {
    this.currentFontSize = fontSize;
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.redrawCanvas();
  }

  private socketMessageHandler = (event: MessageEvent) => {
    try {
      const message =
        typeof event.data === "string"
          ? JSON.parse(event.data)
          : JSON.parse(event.data.toString());

      if (message.type === "chat" && message.roomId === this.roomId) {
        const parsedShape = JSON.parse(message.message);
        if (parsedShape.type === "update") {
          this.existingShapes = parsedShape.shapes;
        } else if (parsedShape.shape) {
          this.existingShapes.push(parsedShape.shape);
        }
        this.redrawCanvas();
      }
    } catch (err) {
      console.error("Error processing game socket message:", err);
    }
  };

  initHandlers() {
    this.socket.addEventListener("message", this.socketMessageHandler);
  }

  private screenToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale,
    };
  }

  private canvasToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY,
    };
  }

  private zoom(deltaY: number, centerX: number, centerY: number) {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

    if (newScale !== this.scale) {
      const canvasPoint = this.screenToCanvas(centerX, centerY);
      this.scale = newScale;
      const newScreenPoint = this.canvasToScreen(canvasPoint.x, canvasPoint.y);

      this.offsetX += centerX - newScreenPoint.x;
      this.offsetY += centerY - newScreenPoint.y;

      this.redrawCanvas();
    }
  }

  private pan(deltaX: number, deltaY: number) {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    this.redrawCanvas();
  }

  redrawCanvas() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    this.existingShapes.forEach((shape) => this.drawShape(shape));

    this.ctx.restore();
  }

  drawShape(shape: Shape | undefined) {
    if (!shape || !shape.type) return;

    this.ctx.save();

    if (shape.type !== "eraser" && shape.type !== "move" && shape.type !== "text") {
      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.lineWidth;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
    }

    switch (shape.type) {
      case "rect": {
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      }

      case "circle": {
        this.ctx.beginPath();
        this.ctx.ellipse(
          shape.centerX,
          shape.centerY,
          Math.abs(shape.radiusX),
          Math.abs(shape.radiusY),
          0,
          0,
          Math.PI * 2
        );
        this.ctx.stroke();
        this.ctx.closePath();
        break;
      }

      case "pencil": {
        if (shape.points && shape.points.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          this.ctx.stroke();
          this.ctx.closePath();
        }
        break;
      }

      case "line": {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();
        this.ctx.closePath();
        break;
      }

      case "arrow": {
        const headLength = Math.max(12, shape.lineWidth * 3.5);
        const dx = shape.endX - shape.startX;
        const dy = shape.endY - shape.startY;
        const angle = Math.atan2(dy, dx);

        // Main line
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();

        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(shape.endX, shape.endY);
        this.ctx.lineTo(
          shape.endX - headLength * Math.cos(angle - Math.PI / 6),
          shape.endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(shape.endX, shape.endY);
        this.ctx.lineTo(
          shape.endX - headLength * Math.cos(angle + Math.PI / 6),
          shape.endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
        this.ctx.closePath();
        break;
      }

      case "diamond": {
        const halfW = Math.abs(shape.width) / 2;
        const halfH = Math.abs(shape.height) / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(shape.centerX, shape.centerY - halfH);
        this.ctx.lineTo(shape.centerX + halfW, shape.centerY);
        this.ctx.lineTo(shape.centerX, shape.centerY + halfH);
        this.ctx.lineTo(shape.centerX - halfW, shape.centerY);
        this.ctx.closePath();
        this.ctx.stroke();
        break;
      }

      case "text": {
        this.ctx.font = `${shape.fontSize || 20}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this.ctx.fillStyle = shape.color;
        this.ctx.textBaseline = "top";
        const lines = shape.text.split("\n");
        const lineHeight = (shape.fontSize || 20) * 1.3;
        lines.forEach((line, i) => {
          this.ctx.fillText(line, shape.x, shape.y + i * lineHeight);
        });
        break;
      }

      case "move": {
        const movedShape = this.getMovedShape(shape);
        this.drawShape(movedShape);
        break;
      }
    }

    this.ctx.restore();
  }

  getMovedShape(moveShape: Shape & { type: "move" }): Shape {
    const { shape, offsetX, offsetY } = moveShape;
    switch (shape.type) {
      case "rect":
        return {
          ...shape,
          x: shape.x + offsetX,
          y: shape.y + offsetY,
        };
      case "circle":
        return {
          ...shape,
          centerX: shape.centerX + offsetX,
          centerY: shape.centerY + offsetY,
        };
      case "pencil":
        return {
          ...shape,
          points: shape.points.map((point) => ({
            x: point.x + offsetX,
            y: point.y + offsetY,
          })),
        };
      case "line":
        return {
          ...shape,
          startX: shape.startX + offsetX,
          startY: shape.startY + offsetY,
          endX: shape.endX + offsetX,
          endY: shape.endY + offsetY,
        };
      case "arrow":
        return {
          ...shape,
          startX: shape.startX + offsetX,
          startY: shape.startY + offsetY,
          endX: shape.endX + offsetX,
          endY: shape.endY + offsetY,
        };
      case "diamond":
        return {
          ...shape,
          centerX: shape.centerX + offsetX,
          centerY: shape.centerY + offsetY,
        };
      case "text":
        return {
          ...shape,
          x: shape.x + offsetX,
          y: shape.y + offsetY,
        };
      default:
        return shape;
    }
  }

  private wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      this.zoom(e.deltaY, x, y);
    } else {
      this.pan(-e.deltaX, -e.deltaY);
    }
  };

  private keyDownHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.isPanning = true;
      this.canvas.style.cursor = "grab";
    }
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.isPanning = false;
      this.setTool(this.selectedTool);
    }
  };

  private cleanupActiveTextArea() {
    if (this.activeTextArea && this.activeTextArea.parentNode) {
      this.activeTextArea.parentNode.removeChild(this.activeTextArea);
      this.activeTextArea = null;
    }
  }

  private spawnTextInput(screenX: number, screenY: number, canvasX: number, canvasY: number) {
    this.cleanupActiveTextArea();

    const textarea = document.createElement("textarea");
    this.activeTextArea = textarea;

    textarea.style.position = "fixed";
    textarea.style.left = `${screenX}px`;
    textarea.style.top = `${screenY}px`;
    textarea.style.minWidth = "120px";
    textarea.style.minHeight = "40px";
    textarea.style.padding = "4px 8px";
    textarea.style.border = "2px dashed #0284c7";
    textarea.style.borderRadius = "8px";
    textarea.style.background = "rgba(255, 255, 255, 0.9)";
    textarea.style.color = this.currentColor;
    textarea.style.font = `${this.currentFontSize}px sans-serif`;
    textarea.style.outline = "none";
    textarea.style.resize = "both";
    textarea.style.zIndex = "40";

    const commitText = () => {
      const textVal = textarea.value.trim();
      if (textVal) {
        const newShape: Shape = {
          type: "text",
          x: canvasX,
          y: canvasY,
          text: textVal,
          color: this.currentColor,
          fontSize: this.currentFontSize,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
        this.redrawCanvas();
      }
      this.cleanupActiveTextArea();
    };

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitText();
      } else if (e.key === "Escape") {
        this.cleanupActiveTextArea();
      }
    });

    textarea.addEventListener("blur", () => {
      commitText();
    });

    document.body.appendChild(textarea);
    setTimeout(() => textarea.focus(), 50);
  }

  mouseDownHandler = (e: MouseEvent) => {
    this.clicked = true;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isPanning) {
      this.lastPanX = screenX;
      this.lastPanY = screenY;
      return;
    }

    const canvasPoint = this.screenToCanvas(screenX, screenY);
    this.startX = canvasPoint.x;
    this.startY = canvasPoint.y;
    this.currentMouseX = this.startX;
    this.currentMouseY = this.startY;

    if (this.selectedTool === "text") {
      this.clicked = false;
      this.spawnTextInput(e.clientX, e.clientY, canvasPoint.x, canvasPoint.y);
      return;
    }

    if (this.selectedTool === "pencil") {
      this.currentPencilStroke = [{ x: this.startX, y: this.startY }];
    } else if (this.selectedTool === "eraser") {
      this.hasErasedInCurrentDrag = false;
      this.eraseShape(this.startX, this.startY);
    } else if (this.selectedTool === "move") {
      const shapeToMove = [...this.existingShapes].reverse().find((shape) => {
        if (shape.type === "move") return false;
        const x = this.startX;
        const y = this.startY;
        const hitThreshold = 12 / this.scale;

        if (shape.type === "rect") {
          return (
            x >= shape.x &&
            x <= shape.x + shape.width &&
            y >= shape.y &&
            y <= shape.y + shape.height
          );
        } else if (shape.type === "circle") {
          const normalizedX = (x - shape.centerX) / shape.radiusX;
          const normalizedY = (y - shape.centerY) / shape.radiusY;
          return normalizedX * normalizedX + normalizedY * normalizedY <= 1.2;
        } else if (shape.type === "pencil") {
          for (let i = 0; i < shape.points.length - 1; i++) {
            if (
              distToSegment(
                x,
                y,
                shape.points[i].x,
                shape.points[i].y,
                shape.points[i + 1].x,
                shape.points[i + 1].y
              ) <= hitThreshold
            ) {
              return true;
            }
          }
          return false;
        } else if (shape.type === "line" || shape.type === "arrow") {
          return (
            distToSegment(x, y, shape.startX, shape.startY, shape.endX, shape.endY) <=
            hitThreshold
          );
        } else if (shape.type === "diamond") {
          const halfW = Math.abs(shape.width) / 2;
          const halfH = Math.abs(shape.height) / 2;
          return (
            Math.abs(x - shape.centerX) / halfW + Math.abs(y - shape.centerY) / halfH <= 1.1
          );
        } else if (shape.type === "text") {
          const lines = shape.text.split("\n");
          const fontSize = shape.fontSize || 20;
          const height = lines.length * fontSize * 1.3;
          const width = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6;
          return x >= shape.x && x <= shape.x + width && y >= shape.y && y <= shape.y + height;
        }
        return false;
      });

      if (shapeToMove) {
        this.existingShapes = this.existingShapes.filter((shape) => shape !== shapeToMove);
        const moveShape = {
          type: "move" as const,
          shape: shapeToMove,
          offsetX: 0,
          offsetY: 0,
        };
        this.activeShape = moveShape;
        this.existingShapes.push(moveShape);
        this.redrawCanvas();
      }
    }
  };

  mouseUpHandler = (e: MouseEvent) => {
    if (!this.clicked) return;

    this.clicked = false;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = this.screenToCanvas(screenX, screenY);

    if (this.selectedTool === "rect") {
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      if (Math.hypot(width, height) > 2) {
        const newShape: Shape = {
          type: "rect",
          x: Math.min(this.startX, canvasPoint.x),
          y: Math.min(this.startY, canvasPoint.y),
          width: Math.abs(width),
          height: Math.abs(height),
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "circle") {
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      if (Math.abs(width) > 2 || Math.abs(height) > 2) {
        const newShape: Shape = {
          type: "circle",
          centerX: this.startX + width / 2,
          centerY: this.startY + height / 2,
          radiusX: Math.abs(width / 2),
          radiusY: Math.abs(height / 2),
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "line") {
      const dist = Math.hypot(canvasPoint.x - this.startX, canvasPoint.y - this.startY);
      if (dist > 2) {
        const newShape: Shape = {
          type: "line",
          startX: this.startX,
          startY: this.startY,
          endX: canvasPoint.x,
          endY: canvasPoint.y,
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "arrow") {
      const dist = Math.hypot(canvasPoint.x - this.startX, canvasPoint.y - this.startY);
      if (dist > 2) {
        const newShape: Shape = {
          type: "arrow",
          startX: this.startX,
          startY: this.startY,
          endX: canvasPoint.x,
          endY: canvasPoint.y,
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "diamond") {
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      if (Math.abs(width) > 2 || Math.abs(height) > 2) {
        const newShape: Shape = {
          type: "diamond",
          centerX: this.startX + width / 2,
          centerY: this.startY + height / 2,
          width: Math.abs(width),
          height: Math.abs(height),
          color: this.currentColor,
          lineWidth: this.currentLineWidth,
        };
        this.existingShapes.push(newShape);
        this.socket.send(
          JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape: newShape }),
            roomId: this.roomId,
          })
        );
      }
    } else if (this.selectedTool === "pencil" && this.currentPencilStroke.length > 1) {
      const newShape: Shape = {
        type: "pencil",
        points: this.currentPencilStroke,
        color: this.currentColor,
        lineWidth: this.currentLineWidth,
      };
      this.existingShapes.push(newShape);
      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ shape: newShape }),
          roomId: this.roomId,
        })
      );
    } else if (this.selectedTool === "eraser" && this.hasErasedInCurrentDrag) {
      // Sync final erased state once drag finishes (prevents network flooding)
      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
          roomId: this.roomId,
        })
      );
      this.hasErasedInCurrentDrag = false;
    } else if (this.selectedTool === "move" && this.activeShape) {
      const moveShape = this.activeShape as Shape & { type: "move" };
      const finalShape = this.getMovedShape(moveShape);

      this.existingShapes = this.existingShapes.filter((shape) => shape.type !== "move");
      this.existingShapes.push(finalShape);
      this.activeShape = null;

      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
          roomId: this.roomId,
        })
      );
    }

    this.redrawCanvas();
  };

  private drawEraserPreview(x: number, y: number) {
    const radius = 16 / this.scale;
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
    this.ctx.lineWidth = 1.5 / this.scale;
    this.ctx.stroke();

    this.ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    this.ctx.fill();

    this.ctx.restore();
  }

  mouseMoveHandler = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.clicked && this.isPanning) {
      const deltaX = screenX - this.lastPanX;
      const deltaY = screenY - this.lastPanY;
      this.pan(deltaX, deltaY);
      this.lastPanX = screenX;
      this.lastPanY = screenY;
      return;
    }

    const canvasPoint = this.screenToCanvas(screenX, screenY);
    this.currentMouseX = canvasPoint.x;
    this.currentMouseY = canvasPoint.y;

    if (!this.clicked) return;

    if (this.selectedTool === "rect") {
      this.redrawCanvas();
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.strokeRect(
        Math.min(this.startX, canvasPoint.x),
        Math.min(this.startY, canvasPoint.y),
        Math.abs(width),
        Math.abs(height)
      );
      this.ctx.restore();
    } else if (this.selectedTool === "circle") {
      this.redrawCanvas();
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.startX + width / 2,
        this.startY + height / 2,
        Math.abs(width / 2),
        Math.abs(height / 2),
        0,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.restore();
    } else if (this.selectedTool === "line") {
      this.redrawCanvas();
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(canvasPoint.x, canvasPoint.y);
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.restore();
    } else if (this.selectedTool === "arrow") {
      this.redrawCanvas();
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;

      const headLength = Math.max(12, this.currentLineWidth * 3.5);
      const dx = canvasPoint.x - this.startX;
      const dy = canvasPoint.y - this.startY;
      const angle = Math.atan2(dy, dx);

      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(canvasPoint.x, canvasPoint.y);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(canvasPoint.x, canvasPoint.y);
      this.ctx.lineTo(
        canvasPoint.x - headLength * Math.cos(angle - Math.PI / 6),
        canvasPoint.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.moveTo(canvasPoint.x, canvasPoint.y);
      this.ctx.lineTo(
        canvasPoint.x - headLength * Math.cos(angle + Math.PI / 6),
        canvasPoint.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.restore();
    } else if (this.selectedTool === "diamond") {
      this.redrawCanvas();
      const width = canvasPoint.x - this.startX;
      const height = canvasPoint.y - this.startY;
      const centerX = this.startX + width / 2;
      const centerY = this.startY + height / 2;
      const halfW = Math.abs(width) / 2;
      const halfH = Math.abs(height) / 2;

      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY - halfH);
      this.ctx.lineTo(centerX + halfW, centerY);
      this.ctx.lineTo(centerX, centerY + halfH);
      this.ctx.lineTo(centerX - halfW, centerY);
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    } else if (this.selectedTool === "pencil") {
      this.currentPencilStroke.push({ x: canvasPoint.x, y: canvasPoint.y });
      this.ctx.save();
      this.ctx.translate(this.offsetX, this.offsetY);
      this.ctx.scale(this.scale, this.scale);
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.beginPath();
      this.ctx.moveTo(this.currentPencilStroke[0].x, this.currentPencilStroke[0].y);
      for (let i = 1; i < this.currentPencilStroke.length; i++) {
        this.ctx.lineTo(this.currentPencilStroke[i].x, this.currentPencilStroke[i].y);
      }
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.restore();
    } else if (this.selectedTool === "eraser") {
      this.eraseShape(canvasPoint.x, canvasPoint.y);
      this.drawEraserPreview(canvasPoint.x, canvasPoint.y);
    } else if (this.selectedTool === "move" && this.activeShape) {
      const moveShape = this.activeShape as Shape & { type: "move" };
      moveShape.offsetX = canvasPoint.x - this.startX;
      moveShape.offsetY = canvasPoint.y - this.startY;
      this.redrawCanvas();
    }
  };

  eraseShape(x: number, y: number) {
    const eraserRadius = 16 / this.scale;
    const initialCount = this.existingShapes.length;

    this.existingShapes = this.existingShapes.filter((shape) => {
      switch (shape.type) {
        case "rect": {
          const left = shape.x;
          const right = shape.x + shape.width;
          const top = shape.y;
          const bottom = shape.y + shape.height;

          // Check if eraser touches any of the 4 border segments or is inside
          const nearBorder =
            distToSegment(x, y, left, top, right, top) <= eraserRadius ||
            distToSegment(x, y, right, top, right, bottom) <= eraserRadius ||
            distToSegment(x, y, right, bottom, left, bottom) <= eraserRadius ||
            distToSegment(x, y, left, bottom, left, top) <= eraserRadius;

          const inside = x >= left && x <= right && y >= top && y <= bottom;
          return !(nearBorder || inside);
        }

        case "circle": {
          const dist = Math.hypot(x - shape.centerX, y - shape.centerY);
          const maxR = Math.max(Math.abs(shape.radiusX), Math.abs(shape.radiusY));
          return dist > maxR + eraserRadius;
        }

        case "pencil": {
          if (!shape.points || shape.points.length === 0) return true;
          if (shape.points.length === 1) {
            return Math.hypot(x - shape.points[0].x, y - shape.points[0].y) > eraserRadius;
          }
          // Segment-by-segment precision hit test
          for (let i = 0; i < shape.points.length - 1; i++) {
            if (
              distToSegment(
                x,
                y,
                shape.points[i].x,
                shape.points[i].y,
                shape.points[i + 1].x,
                shape.points[i + 1].y
              ) <= eraserRadius
            ) {
              return false; // Hit! Erase
            }
          }
          return true;
        }

        case "line":
        case "arrow": {
          return (
            distToSegment(x, y, shape.startX, shape.startY, shape.endX, shape.endY) >
            eraserRadius
          );
        }

        case "diamond": {
          const halfW = Math.abs(shape.width) / 2;
          const halfH = Math.abs(shape.height) / 2;
          const topPt = { x: shape.centerX, y: shape.centerY - halfH };
          const rightPt = { x: shape.centerX + halfW, y: shape.centerY };
          const bottomPt = { x: shape.centerX, y: shape.centerY + halfH };
          const leftPt = { x: shape.centerX - halfW, y: shape.centerY };

          const nearEdge =
            distToSegment(x, y, topPt.x, topPt.y, rightPt.x, rightPt.y) <= eraserRadius ||
            distToSegment(x, y, rightPt.x, rightPt.y, bottomPt.x, bottomPt.y) <= eraserRadius ||
            distToSegment(x, y, bottomPt.x, bottomPt.y, leftPt.x, leftPt.y) <= eraserRadius ||
            distToSegment(x, y, leftPt.x, leftPt.y, topPt.x, topPt.y) <= eraserRadius;

          const inside =
            Math.abs(x - shape.centerX) / halfW + Math.abs(y - shape.centerY) / halfH <= 1.0;

          return !(nearEdge || inside);
        }

        case "text": {
          const lines = shape.text.split("\n");
          const fontSize = shape.fontSize || 20;
          const height = lines.length * fontSize * 1.3;
          const width = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6;
          const inside =
            x >= shape.x - eraserRadius &&
            x <= shape.x + width + eraserRadius &&
            y >= shape.y - eraserRadius &&
            y <= shape.y + height + eraserRadius;
          return !inside;
        }

        default:
          return true;
      }
    });

    if (initialCount !== this.existingShapes.length) {
      this.hasErasedInCurrentDrag = true;
      this.redrawCanvas();
    }
  }

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
  }

  initZoomHandlers() {
    this.canvas.addEventListener("wheel", this.wheelHandler);
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }
}