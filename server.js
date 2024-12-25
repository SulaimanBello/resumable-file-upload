// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

class UploadServer {
  constructor(port = 80) {
    this.port = port;
    this.uploadsDir = path.join(__dirname, 'uploads');
    this.server = http.createServer(this.handleRequest.bind(this));
    this.setupUploadsDirectory();
  }

  setupUploadsDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir);
    }
  }

  async handleRequest(req, res) {
    try {
      switch(req.url) {
        case "/":
          await this.serveFile(res, "public/index.html");
          break;
        case "/app.js":
          await this.serveFile(res, "public/app.js");
          break;
        case "/upload":
          await this.handleUpload(req, res);
          break;
        default:
          this.send404(res);
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async serveFile(res, filePath) {
    try {
      const content = await fs.promises.readFile(filePath);
      const contentType = this.getContentType(filePath);
      res.setHeader('Content-Type', contentType);
      res.end(content);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async handleUpload(req, res) {
    const fileName = req.headers["file-name"];
    if (!fileName) {
      return this.handleError(res, new Error("No filename provided"), 400);
    }

    const filePath = path.join(this.uploadsDir, fileName);
    const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    
    req.on('error', error => this.handleError(res, error));
    writeStream.on('error', error => this.handleError(res, error));
    
    req.pipe(writeStream);
    
    writeStream.on('finish', () => {
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        status: 'success',
        message: 'Chunk uploaded successfully'
      }));
    });
  }

  getContentType(filePath) {
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  handleError(res, error, statusCode = 500) {
    console.error('Error:', error);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      status: 'error',
      message: error.message 
    }));
  }

  send404(res) {
    res.statusCode = 404;
    res.end('Not Found');
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }
}

const server = new UploadServer();
server.start();
