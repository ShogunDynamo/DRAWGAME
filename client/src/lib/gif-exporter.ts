import { type Room, type GameChain } from "@shared/schema";

interface GifFrame {
  imageData: string;
  delay: number;
  text?: string;
}

export class GifExporter {
  private frames: GifFrame[] = [];
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.context = this.canvas.getContext("2d")!;
  }

  async generateGameSequenceGif(room: Room, chains: GameChain[]): Promise<Blob> {
    this.frames = [];

    for (const chain of chains) {
      await this.addChainFrames(chain, room);
    }

    return this.renderGif();
  }

  private async addChainFrames(chain: GameChain, room: Room) {
    // Add title frame
    await this.addTitleFrame(`Chain ${chain.chainIndex + 1}`, 2000);

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      const player = room.players.find(p => p.id === step.playerId);
      const playerName = player?.name || "Unknown Player";

      if (step.type === "prompt") {
        await this.addTextFrame(
          `${playerName} wrote:`,
          step.content,
          3000
        );
      } else if (step.type === "drawing") {
        await this.addDrawingFrame(
          `${playerName} drew:`,
          step.content,
          4000
        );
      } else if (step.type === "guess") {
        await this.addTextFrame(
          `${playerName} guessed:`,
          step.content,
          3000
        );
      }

      // Add transition frame between steps
      if (i < chain.steps.length - 1) {
        await this.addTransitionFrame(500);
      }
    }

    // Add final result frame
    if (chain.finalResult) {
      await this.addTextFrame(
        "Final Result:",
        chain.finalResult,
        4000
      );
    }
  }

  private async addTitleFrame(title: string, duration: number) {
    this.clearCanvas();
    this.drawBackground("#1a1625");
    
    this.context.fillStyle = "#a855f7";
    this.context.font = "bold 48px Inter";
    this.context.textAlign = "center";
    this.context.fillText(title, this.canvas.width / 2, this.canvas.height / 2);

    this.frames.push({
      imageData: this.canvas.toDataURL(),
      delay: duration,
    });
  }

  private async addTextFrame(header: string, text: string, duration: number) {
    this.clearCanvas();
    this.drawBackground("#1e293b");

    // Header
    this.context.fillStyle = "#3b82f6";
    this.context.font = "bold 32px Inter";
    this.context.textAlign = "center";
    this.context.fillText(header, this.canvas.width / 2, 150);

    // Text content
    this.context.fillStyle = "#f1f5f9";
    this.context.font = "28px Inter";
    this.wrapText(text, this.canvas.width / 2, 250, this.canvas.width - 100, 40);

    this.frames.push({
      imageData: this.canvas.toDataURL(),
      delay: duration,
    });
  }

  private async addDrawingFrame(header: string, drawingData: string, duration: number) {
    this.clearCanvas();
    this.drawBackground("#1e293b");

    // Header
    this.context.fillStyle = "#3b82f6";
    this.context.font = "bold 32px Inter";
    this.context.textAlign = "center";
    this.context.fillText(header, this.canvas.width / 2, 80);

    // Drawing area
    const drawingArea = {
      x: 50,
      y: 120,
      width: this.canvas.width - 100,
      height: this.canvas.height - 200,
    };

    this.context.fillStyle = "#ffffff";
    this.context.fillRect(drawingArea.x, drawingArea.y, drawingArea.width, drawingArea.height);

    // Try to render the drawing data
    try {
      if (drawingData.startsWith("data:image")) {
        // It's a base64 image
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = drawingData;
        });

        // Scale and center the image
        const scale = Math.min(
          drawingArea.width / img.width,
          drawingArea.height / img.height
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = drawingArea.x + (drawingArea.width - scaledWidth) / 2;
        const y = drawingArea.y + (drawingArea.height - scaledHeight) / 2;

        this.context.drawImage(img, x, y, scaledWidth, scaledHeight);
      } else {
        // Fallback: show placeholder
        this.context.fillStyle = "#94a3b8";
        this.context.font = "20px Inter";
        this.context.textAlign = "center";
        this.context.fillText(
          "Drawing Preview",
          this.canvas.width / 2,
          this.canvas.height / 2
        );
      }
    } catch (error) {
      console.error("Failed to render drawing:", error);
      // Show error placeholder
      this.context.fillStyle = "#ef4444";
      this.context.font = "20px Inter";
      this.context.textAlign = "center";
      this.context.fillText(
        "Could not load drawing",
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }

    this.frames.push({
      imageData: this.canvas.toDataURL(),
      delay: duration,
    });
  }

  private async addTransitionFrame(duration: number) {
    this.clearCanvas();
    this.drawBackground("#0f172a");

    // Add subtle animation dots
    this.context.fillStyle = "#64748b";
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    for (let i = 0; i < 3; i++) {
      this.context.beginPath();
      this.context.arc(centerX - 40 + i * 40, centerY, 8, 0, Math.PI * 2);
      this.context.fill();
    }

    this.frames.push({
      imageData: this.canvas.toDataURL(),
      delay: duration,
    });
  }

  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(color: string) {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = this.context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        this.context.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.context.fillText(line, x, currentY);
  }

  private async renderGif(): Promise<Blob> {
    // For a real implementation, you would use a GIF encoding library like gif.js
    // For now, we'll create a simple mock implementation
    
    try {
      // Import gif.js dynamically if available
      const { GIF } = await import("gif.js") as any;
      
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: this.canvas.width,
        height: this.canvas.height,
      });

      for (const frame of this.frames) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = frame.imageData;
        });

        // Create a temporary canvas for this frame
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = this.canvas.width;
        frameCanvas.height = this.canvas.height;
        const frameContext = frameCanvas.getContext("2d")!;
        frameContext.drawImage(img, 0, 0);

        gif.addFrame(frameCanvas, { delay: frame.delay });
      }

      return new Promise((resolve, reject) => {
        gif.on("finished", (blob: any) => {
          resolve(blob);
        });

        gif.on("error", (error: any) => {
          reject(error);
        });

        gif.render();
      });

    } catch (error) {
      console.error("gif.js not available, creating fallback:", error);
      
      // Fallback: return the last frame as a static image
      const lastFrame = this.frames[this.frames.length - 1];
      if (lastFrame) {
        const response = await fetch(lastFrame.imageData);
        return response.blob();
      }
      
      throw new Error("No frames to export");
    }
  }

  async exportFrames(): Promise<string[]> {
    return this.frames.map(frame => frame.imageData);
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getDuration(): number {
    return this.frames.reduce((total, frame) => total + frame.delay, 0);
  }
}
