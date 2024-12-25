// app.js
class FileUploader {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 50000;
    this.maxRetries = options.maxRetries || 3;
    this.initElements();
    this.initState();
    this.bindEvents();
  }

  initElements() {
    this.uploadBtn = document.getElementById("btnUpload");
    this.pauseBtn = document.getElementById("pause");
    this.fileInput = document.getElementById("f");
    this.output = document.getElementById("divOutput");
  }

  initState() {
    this.fileData = null;
    this.isUploading = false;
    this.isPaused = false;
    this.lastChunkId = 0;
  }

  bindEvents() {
    this.uploadBtn.addEventListener("click", () => this.startUpload());
    this.pauseBtn.addEventListener("click", () => this.togglePause());
  }

  async startUpload() {
    if (this.isUploading) return;
    
    try {
      this.isUploading = true;
      const file = await this.readFile();
      await this.uploadChunks(file);
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`);
    } finally {
      this.isUploading = false;
    }
  }

  async readFile() {
    if (!this.fileInput.files[0]) {
      throw new Error("Please select a file");
    }

    if (this.fileData) return this.fileData;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const file = this.fileInput.files[0];

      reader.onload = (event) => {
        this.fileData = {
          data: event.target.result,
          metadata: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        };
        resolve(this.fileData);
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async uploadChunks(file) {
    const totalChunks = Math.ceil(file.data.byteLength / this.chunkSize);
    
    for (let chunkId = this.lastChunkId; chunkId < totalChunks; chunkId++) {
      if (this.isPaused) {
        this.updateStatus(`Paused at chunk ${chunkId}/${totalChunks}`);
        return;
      }

      const chunk = file.data.slice(
        chunkId * this.chunkSize,
        (chunkId + 1) * this.chunkSize
      );

      let retries = 0;
      while (retries < this.maxRetries) {
        try {
          await this.uploadChunk(chunk, file.metadata.name);
          this.lastChunkId = chunkId;
          this.updateStatus(`Uploaded ${chunkId + 1}/${totalChunks} chunks`);
          break;
        } catch (error) {
          retries++;
          if (retries === this.maxRetries) {
            throw new Error(`Failed to upload chunk after ${this.maxRetries} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    this.updateStatus('Upload complete!');
    this.reset();
  }

  async uploadChunk(chunk, fileName) {
    const response = await fetch("/upload", {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "content-length": chunk.byteLength,
        "file-name": fileName
      },
      body: chunk
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.pauseBtn.value = this.isPaused ? 'paused' : 'resumed';
    
    if (!this.isPaused && this.fileData) {
      this.uploadChunks(this.fileData);
    }
  }

  updateStatus(message) {
    this.output.textContent = message;
  }

  reset() {
    this.initState();
  }
}

// Initialize uploader
const uploader = new FileUploader({
  chunkSize: 50000,
  maxRetries: 3
});
