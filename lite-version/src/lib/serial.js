export class PrinterConnection {
  constructor(onData, onDisconnect) {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.onData = onData;
    this.onDisconnect = onDisconnect;
    this.keepReading = true;
    this.readPromise = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
  }

  async connect(baudRate = 115200) {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate });
      
      // Some printers reset on connect. Wait a moment before starting.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.keepReading = true;
      
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Start the read loop
      this.readPromise = this.readLoop();
      return true;
    } catch (err) {
      console.error("Connection error:", err);
      return false;
    }
  }

  async readLoop() {
    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';
    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex + 1);
            buffer = buffer.slice(newlineIndex + 1);
            this.onData(line.trim());
          }
        }
      }
    } catch (error) {
      console.error("Read error:", error);
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
      }
    }
  }

  async write(command) {
    if (this.writer) {
      // Ensure the command ends with a newline, which Marlin expects
      let cmd = command;
      if (!cmd.endsWith('\n')) cmd += '\n';
      await this.writer.write(cmd);
    }
  }

  async disconnect() {
    this.keepReading = false;
    
    if (this.reader) {
      await this.reader.cancel().catch(() => {});
      this.reader = null;
    }
    if (this.readableStreamClosed) {
      await this.readableStreamClosed.catch(() => {});
      this.readableStreamClosed = null;
    }
    
    if (this.writer) {
      await this.writer.close().catch(() => {});
      this.writer = null;
    }
    if (this.writableStreamClosed) {
      await this.writableStreamClosed.catch(() => {});
      this.writableStreamClosed = null;
    }

    if (this.port) {
      await this.port.close().catch(e => console.error("Error closing port:", e));
      this.port = null;
    }
    
    if (this.onDisconnect) {
      this.onDisconnect();
    }
  }
}
