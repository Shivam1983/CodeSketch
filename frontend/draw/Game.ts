import { getExistingShapes } from "./http";

type Tool = "circle" | "rect" | "pencil" | "eraser" | "move";

export type Shape =
  | { type: "rect"; x: number; y: number; width: number; height: number; color: string; lineWidth: number }
  | { type: "circle"; centerX: number; centerY: number; radiusX: number; radiusY: number; color: string; lineWidth: number }
  | { type: "pencil"; points: { x: number; y: number }[]; color: string; lineWidth: number }
  | { type: "move"; shape: Shape; offsetX: number; offsetY: number }
  // | { type: "eraser"; x: number; y: number; width: number; height: number };
  | { type: "eraser"; points: { x: number; y: number }[]; radius: number };

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

  private scale: number = 1;
  private minScale: number = 0.1;
  private maxScale: number = 5;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

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
  }

  setTool(tool: Tool) {
    this.selectedTool = tool;
    this.canvas.style.cursor = tool === "move" ? "move" : "crosshair";
  }

  setColor(color: string) {
    this.currentColor = color;
    this.redrawCanvas();
  }

  setLineWidth(lineWidth: number) {
    this.currentLineWidth = lineWidth;
    this.redrawCanvas();
  }

  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.redrawCanvas();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "chat") {
        const parsedShape = JSON.parse(message.message);
        if (parsedShape.type === "update") {
          this.existingShapes = parsedShape.shapes;
        } else {
          this.existingShapes.push(parsedShape.shape);
        }
        this.redrawCanvas();
      }
    };
  }

  private screenToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }

  private canvasToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY
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
  
    if (shape.type !== "eraser" && shape.type !== "move") {
      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.lineWidth;
    }
  
    if (shape.type === "rect") {
      this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "pencil") {
      if (shape.points.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach((point) => this.ctx.lineTo(point.x, point.y));
        this.ctx.stroke();
        this.ctx.closePath();
      }
    } else if (shape.type === "circle") {
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
    } else if (shape.type === "move") {
      const movedShape = this.getMovedShape(shape);
      this.drawShape(movedShape);
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
      this.canvas.style.cursor = this.selectedTool === "move" ? "move" : "crosshair";
    }
  };

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
  
    if (this.selectedTool === "pencil") {
      this.currentPencilStroke = [{ x: this.startX, y: this.startY }];
    } else if (this.selectedTool === "eraser") {
      this.activeShape = {
        type: "eraser",
        points: [{ x: this.startX, y: this.startY }],
        radius: 10
      };
      this.eraseShape(this.startX, this.startY);
    } else if (this.selectedTool === "move") {
      const shapeToMove = [...this.existingShapes].reverse().find((shape) => {
        if (shape.type === "move") return false; // Skip existing move shapes
        if (shape.type === "rect") {
          return (
            this.startX >= shape.x &&
            this.startX <= shape.x + shape.width &&
            this.startY >= shape.y &&
            this.startY <= shape.y + shape.height
          );
        } else if (shape.type === "circle") {
          // Calculate if the point is inside the oval using the standard equation of an ellipse
          const normalizedX = (this.startX - shape.centerX) / shape.radiusX;
          const normalizedY = (this.startY - shape.centerY) / shape.radiusY;
          return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
        } else if (shape.type === "pencil") {
          return shape.points.some(
            (point) => Math.hypot(this.startX - point.x, this.startY - point.y) <= 10 / this.scale
          );
        }
        return false;
      });
  
      if (shapeToMove) {
        // Remove the original shape and any existing move shapes
        this.existingShapes = this.existingShapes.filter(shape => shape !== shapeToMove);
        
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
      const radius = Math.hypot(width, height);
      if (radius > 1) {
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
      if (Math.abs(width) > 1 || Math.abs(height) > 1) {
        const newShape: Shape = {
          type: "circle",
          centerX: this.startX + width/2,
          centerY: this.startY + height/2,
          radiusX: Math.abs(width/2),
          radiusY: Math.abs(height/2),
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
    } else if (this.selectedTool === "move" && this.activeShape) {
      const moveShape = this.activeShape as Shape & { type: "move" };
      const finalShape = this.getMovedShape(moveShape);
      
      // Remove any existing move shapes
      this.existingShapes = this.existingShapes.filter(shape => shape.type !== "move");
      
      // Add the final shape
      this.existingShapes.push(finalShape);
  
      this.activeShape = null;
      
      // Sync with other users
      this.socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
          roomId: this.roomId,
        })
      );
      
      this.activeShape = null;
    }
  
    this.redrawCanvas();
  };
// ... [previous code remains the same until the mouseMoveHandler method]

private drawEraserPreview(x: number, y: number) {
  this.ctx.save();
  this.ctx.translate(this.offsetX, this.offsetY);
  this.ctx.scale(this.scale, this.scale);
  
  // Draw eraser circle
  this.ctx.beginPath();
  this.ctx.arc(x, y, 10, 0, Math.PI * 2);
  this.ctx.strokeStyle = "#ff0000";
  this.ctx.lineWidth = 1 / this.scale;
  this.ctx.stroke();
  
  // Fill with semi-transparent red
  this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
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
    this.ctx.beginPath();
    this.ctx.ellipse(
      this.startX + width/2,
      this.startY + height/2,
      Math.abs(width/2),
      Math.abs(height/2),
      0,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.restore();
  } else if (this.selectedTool === "pencil") {
    this.currentPencilStroke.push({ x: canvasPoint.x, y: canvasPoint.y });
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.beginPath();
    this.ctx.moveTo(this.currentPencilStroke[0].x, this.currentPencilStroke[0].y);
    this.currentPencilStroke.forEach((point) => this.ctx.lineTo(point.x, point.y));
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.restore();
  } else if (this.selectedTool === "eraser") {
   if (this.activeShape?.type === "eraser") {
      this.activeShape.points.push({ x: canvasPoint.x, y: canvasPoint.y });
    }
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
  // const threshold = 10 / this.scale;
  const eraserRadius = 10;
  const previousShapesCount = this.existingShapes.length;

  // this.existingShapes = this.existingShapes.filter((shape) => {
  //   if (shape.type === "rect") {
  //     return !(x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height);
  //   } else if (shape.type === "circle") {
  //     return Math.hypot(x - shape.centerX, y - shape.centerY) > shape.radiusX;
  //   } else if (shape.type === "pencil") {
  //     return shape.points.every((point) => Math.hypot(x - point.x, y - point.y) > threshold);
  //   }
  //   return true;
  // });
  this.existingShapes = this.existingShapes.filter((shape) => {
    if (shape.type === "rect") {
      // Check if eraser circle intersects with rectangle
      const circleDistX = Math.abs(x - (shape.x + shape.width/2));
      const circleDistY = Math.abs(y - (shape.y + shape.height/2));

      if (circleDistX > (shape.width/2 + eraserRadius)) return true;
      if (circleDistY > (shape.height/2 + eraserRadius)) return true;

      if (circleDistX <= (shape.width/2)) return false;
      if (circleDistY <= (shape.height/2)) return false;

      const cornerDistance = Math.pow(circleDistX - shape.width/2, 2) +
                           Math.pow(circleDistY - shape.height/2, 2);

      return cornerDistance > Math.pow(eraserRadius, 2);
    } else if (shape.type === "circle") {
      // Check if eraser circle intersects with shape circle
      const distance = Math.hypot(x - shape.centerX, y - shape.centerY);
      return distance > (Math.max(shape.radiusX, shape.radiusY) + eraserRadius);
    } else if (shape.type === "pencil") {
      // Check if any point of the pencil stroke is within eraser radius
      return shape.points.every((point) => 
        Math.hypot(x - point.x, y - point.y) > eraserRadius
      );
    } else if (shape.type === "eraser") {
      return true; // Don't erase other eraser marks
    }
    return true;
  });

  if (previousShapesCount !== this.existingShapes.length) {
    this.socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({ type: "update", shapes: this.existingShapes }),
        roomId: this.roomId,
      })
    );
  }

  this.redrawCanvas();
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