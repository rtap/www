# RTAP – Real-Time Annotation Protocol

[![RTAP](https://rtap.github.io/www/)](https://rtap.github.io/www/)

rtsp://localhost:8554/stream

## Overview
RTAP is a system for handling and processing live video streams over RTSP/RTMP. The project comprises a server that manages video stream ingestion, conversion, and distribution (via WebSocket) as well as client-side utilities. It integrates FFmpeg for media processing and uses Node.js with Express and WebSocket for stream handling and performance monitoring.

## Project Purpose
RTAP is designed to:
- Receive live video streams via RTSP/RTMP protocols
- Process streams using FFmpeg with options that optimize low latency and real-time performance
- Distribute processed video data over WebSocket connections to clients
- Monitor stream performance, log errors, and attempt automatic reconnections in case of failures
- Serve as a base for further modular development, improved error management, and enhanced security features

## Project Components

### 1. Server (server.js, rtspHandler.js)
- Implements an Express HTTP server along with a WebSocket server
- Uses FFmpeg via the node-rtsp-stream package to ingest and re-encode video streams
- Contains error handling and reconnection logic – including switching between TCP and UDP transport
- Monitors performance and logs detailed stream data and errors using Winston

### 2. Client (located in test2/ and webm/)
- Includes client-side code to connect to the RTSP/RTMP streams
- The test2/client.js connects via WebSocket, receives video frames, and then processes these frames (e.g., by extracting text via OCR with Tesseract)
- The webm module's README includes instructions on how to generate and play back WebM streams created by FFmpeg

### 3. FFmpeg Integration
- FFmpeg is used to probe and convert streams while providing low-latency and quality options
- The configuration options are customizable and allow switching network protocols on error
- Future refactoring will modularize the FFmpeg logic into a separate module

### 4. Logging and Monitoring
- Winston is used to log server activity (errors, stream stats, HTTP request details, etc.)
- The server gathers performance metrics (active streams, memory usage, etc.) and prints periodic stats
- Enhanced logging is planned with more detailed error and performance alerts

## Installation and Setup

### Prerequisites:
- Node.js (v12+ recommended)
- FFmpeg installed on your system and available on the command line
- (Optional) ffprobe for stream probing

### Steps to Install:
1. Clone the Repository:
   ```
   git clone https://github.com/rtap/www.git
   ```
2. Navigate to the project folder:
   ```
   cd www
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Configure environment (optional):
   - Copy the example .env file and adjust settings as needed:
     ```
     cp .env.example .env
     ```
   - Adjust port and other parameters if necessary

### Running the Server:
- For development, simply launch:
  ```
  npm start
  ```
- The server will start on port 5001 (or a port defined in your configuration) and serve HTTP endpoints along with WebSocket connections for stream distribution

## Usage
- The main server (server.js) listens for RTSP stream setup requests from clients
- Clients can send a JSON-formatted message of type "SETUP" via a WebSocket connection with the RTSP URL
- Once the stream is successfully initialized (with FFmpeg handling), the server returns stream configuration information (e.g., the WebSocket endpoint and stream port)
- Additional commands such as "STOP" are implemented to halt streams and free up resources

### Generating Test Streams
The project includes scripts to generate test streams that can be used for development and testing:

1. **RTSP Stream Setup:**
   - **Quick Start (Automated):**
     ```
     ./start_rtsp_stream.sh
     ```
     This script automatically installs the RTSP server if needed, starts it, and generates a test pattern stream at `rtsp://localhost:8554/stream`.

   - **Manual Setup:**
     - Install and configure the RTSP server:
       ```
       ./install_rtsp_server.sh
       ```
     - Start the RTSP server:
       ```
       mediamtx
       ```
     - In a separate terminal, generate the RTSP stream:
       ```
       ./generate_rtsp_stream.sh
       ```
       This interactive script allows you to choose between a test pattern, a video file, or a webcam as the stream source.

2. **RTMP/HLS Stream Generation:**
   ```
   ./generate_stream.sh
   ```
   This versatile script allows you to:
   - Generate either RTMP or HLS streams
   - Choose between test patterns, video files, or webcam as sources
   - Stream directly to the server for processing
   
   The script provides interactive prompts to select your preferred stream type and source.

3. **Testing Streams:**
   - For RTSP streams:
     ```
     ffplay rtsp://localhost:8554/stream
     ```
   - For RTMP streams:
     ```
     ffplay rtmp://localhost:1935/live/stream
     ```
   - For HLS streams:
     ```
     ffplay http://localhost:8080/hls/stream.m3u8
     ```
   
   You can also connect to these streams using the RTAP server by configuring the appropriate URL in your client application.

## Configuration
- All basic configuration constants (like FFmpeg options) are contained in the server file
- Future work will move configuration to separate external files and support environment variables
- Adjust logging levels and connection time-out parameters based on your deployment needs

## Planned Improvements
The project roadmap calls for these enhancements:

### 1. Code Modularization:
- Separate FFmpeg handling into its own module/class
- Create dedicated modules for stream management and performance monitoring

### 2. Enhanced Error Handling:
- Implement more detailed exception handling with retries and timeouts
- Improve reconnection strategies for unstable RTSP connections

### 3. Code Documentation:
- Add JSDoc comments to all classes and methods
- Develop a complete API documentation with usage examples

### 4. Security Enhancements:
- Add authentication for WebSocket connections
- Validate input data to prevent malformed requests and DoS attacks

### 5. Testing:
- Implement unit tests and integration tests
- Add performance testing to monitor system load and reliability

### 6. Resource and Process Management:
- Ensure proper termination of FFmpeg processes
- Implement mechanisms to clean up temporary files and manage resource limits

### 7. Monitoring and Alerting:
- Expand logging system and implement performance metrics
- Create alerts for critical errors in production environments

## Contributing
Contributions are welcome! Please feel free to open issues or submit pull requests for improvements, new features, or bug fixes. Ensure that you follow code documentation standards (using JSDoc where applicable) and adapt tests to cover any code changes.

## Security and Dependency Management

To ensure the security of the application:

1. Regularly update dependencies:
   ```
   npm update
   ```

2. Check for vulnerabilities:
   ```
   npm audit
   ```

3. Fix vulnerabilities when found:
   ```
   npm audit fix
   ```

4. For vulnerabilities that cannot be fixed automatically:
   ```
   npm audit fix --force
   ```
   Note: Use `--force` with caution as it may introduce breaking changes.

The project is regularly maintained to address security vulnerabilities in dependencies.

## License
This project is licensed under the ISC License. See the LICENSE file for details.
