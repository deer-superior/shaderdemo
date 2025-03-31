// Main application structure
const ShaderApp = {
  // Core components
  renderer: null,
  canvas: null,
  shader: null,
  urlHandler: null,

  // Initialize the application
  init() {
    this.canvas = document.getElementById('shader-canvas');
    this.setupWebGL();
    this.urlHandler = new URLHandler();
    
    // Check if URL contains a shader
    const shaderFromURL = this.urlHandler.getShaderFromURL();
    
    if (shaderFromURL) {
      this.loadShaderFromURL(shaderFromURL);
    } else {
      this.generateRandomShader();
    }
    
    this.setupEventListeners();
    this.startRenderLoop();
    this.setupResizeHandler();
  },
  
  // Initialize WebGL
  setupWebGL() {
    try {
      const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (!gl) throw new Error('WebGL not supported');
      
      this.renderer = new ShaderRenderer(gl, this.canvas);
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      this.showNotification('WebGL is not supported in your browser', 'error');
    }
  },
  
  // Set up event listeners
  setupEventListeners() {
    document.getElementById('new-shader').addEventListener('click', () => {
      this.generateRandomShader();
    });
    
    document.getElementById('random-colors').addEventListener('click', () => {
      this.randomizeColors();
    });
    
    document.getElementById('apply-shader').addEventListener('click', () => {
      this.applyEditedShader();
    });
    
    document.getElementById('copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          this.showNotification('Link copied to clipboard!');
        })
        .catch(err => {
          console.error('Could not copy link:', err);
          this.showNotification('Failed to copy link', 'error');
        });
    });
  },
  
  // Handle window resizing
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      const canvasContainer = this.canvas.parentElement;
      this.canvas.width = canvasContainer.clientWidth;
      this.canvas.height = canvasContainer.clientHeight;
      this.renderer.resize(this.canvas.width, this.canvas.height);
    });
    
    // Initial resize
    const canvasContainer = this.canvas.parentElement;
    this.canvas.width = canvasContainer.clientWidth;
    this.canvas.height = canvasContainer.clientHeight;
    this.renderer.resize(this.canvas.width, this.canvas.height);
  },
  
  // Generate a new random shader
  generateRandomShader() {
    const shaderGenerator = new ShaderGenerator();
    const newShader = shaderGenerator.generate();
    
    this.shader = newShader;
    this.renderer.setShader(newShader);
    
    document.getElementById('current-shader').value = newShader;
    document.getElementById('editable-shader').value = newShader;
    
    const compressedShader = this.urlHandler.compressShader(newShader);
    this.urlHandler.updateURL(compressedShader);
    
    this.showNotification('New shader generated');
  },
  
  // Randomize colors in the current shader
  randomizeColors() {
    const currentShader = document.getElementById('current-shader').value;
    
    // Find and replace color values in the shader
    const colorRegex = /vec3\s*\(\s*([0-9]*\.[0-9]+|[0-9]+)\s*,\s*([0-9]*\.[0-9]+|[0-9]+)\s*,\s*([0-9]*\.[0-9]+|[0-9]+)\s*\)/g;
    
    const randomizedShader = currentShader.replace(colorRegex, () => {
      const r = Math.random().toFixed(1);
      const g = Math.random().toFixed(1);
      const b = Math.random().toFixed(1);
      return `vec3(${r}, ${g}, ${b})`;
    });
    
    // Apply the shader with new colors
    this.shader = randomizedShader;
    this.renderer.setShader(randomizedShader);
    
    document.getElementById('current-shader').value = randomizedShader;
    document.getElementById('editable-shader').value = randomizedShader;
    
    const compressedShader = this.urlHandler.compressShader(randomizedShader);
    this.urlHandler.updateURL(compressedShader);
    
    this.showNotification('Colors randomized');
  },
  
  // Apply changes from editable shader
  applyEditedShader() {
    const editedShader = document.getElementById('editable-shader').value;
    
    try {
      this.renderer.setShader(editedShader);
      this.shader = editedShader;
      document.getElementById('current-shader').value = editedShader;
      
      const compressedShader = this.urlHandler.compressShader(editedShader);
      this.urlHandler.updateURL(compressedShader);
      
      this.showNotification('Shader applied successfully');
    } catch (error) {
      console.error('Error applying shader:', error);
      this.showNotification('Error compiling shader: ' + error.message, 'error');
    }
  },
  
  // Load shader from URL
  loadShaderFromURL(shaderCode) {
    this.shader = shaderCode;
    this.renderer.setShader(shaderCode);
    document.getElementById('current-shader').value = shaderCode;
    document.getElementById('editable-shader').value = shaderCode;
  },
  
  // Animation loop
  startRenderLoop() {
    const animate = (time) => {
      this.renderer.render(time);
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  },
  
  // Display notification
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show';
    
    if (type === 'error') {
      notification.style.backgroundColor = 'rgba(180, 30, 30, 0.8)';
    } else {
      notification.style.backgroundColor = 'rgba(30, 30, 30, 0.8)';
    }
    
    setTimeout(() => {
      notification.className = 'notification';
    }, 3000);
  }
};

// Handler for URL operations
class URLHandler {
  constructor() {
    this.compressionLib = LZString; // Using LZString for compression
  }
  
  // Compress shader code
  compressShader(shaderCode) {
    return this.compressionLib.compressToEncodedURIComponent(shaderCode);
  }
  
  // Decompress shader code
  decompressShader(compressedCode) {
    return this.compressionLib.decompressFromEncodedURIComponent(compressedCode);
  }
  
  // Get shader from URL if present
  getShaderFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedShader = urlParams.get('s');
    
    if (compressedShader) {
      return this.decompressShader(compressedShader);
    }
    
    return null;
  }
  
  // Update URL with compressed shader
  updateURL(compressedShader) {
    const newURL = new URL(window.location.origin + window.location.pathname);
    newURL.searchParams.set('s', compressedShader);
    
    window.history.pushState({}, '', newURL.toString());
  }
}

// WebGL Renderer
class ShaderRenderer {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    this.program = null;
    this.timeLocation = null;
    this.resolutionLocation = null;
    this.startTime = Date.now();
    
    this.initDefaultShader();
  }
  
  // Initialize with a default shader
  initDefaultShader() {
    const vertexShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShader = `
      precision mediump float;
      uniform float time;
      uniform vec2 resolution;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        gl_FragColor = vec4(uv.x, uv.y, sin(time * 0.001) * 0.5 + 0.5, 1.0);
      }
    `;
    
    this.createProgram(vertexShader, fragmentShader);
    this.createBuffers();
  }
  
  // Set a new shader
  setShader(fragmentShaderSource) {
    const vertexShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    try {
      this.createProgram(vertexShader, fragmentShaderSource);
      return true;
    } catch (error) {
      console.error('Shader compilation failed:', error);
      throw new Error('Shader compilation failed: ' + error.message);
    }
  }
  
  // Create WebGL program from shaders
  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    
    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader compile error: ' + gl.getShaderInfoLog(vertexShader));
    }
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw new Error('Fragment shader compile error: ' + gl.getShaderInfoLog(fragmentShader));
    }
    
    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader program link error: ' + gl.getProgramInfoLog(program));
    }
    
    // Clean up previous program if exists
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    
    this.program = program;
    gl.useProgram(this.program);
    
    // Get uniform locations
    this.timeLocation = gl.getUniformLocation(program, 'time');
    this.resolutionLocation = gl.getUniformLocation(program, 'resolution');
    
    // Create buffers if needed
    if (!this.positionBuffer) {
      this.createBuffers();
    } else {
      // Re-bind position attribute
      const positionLocation = gl.getAttribLocation(this.program, 'position');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }
  }
  
  // Create vertex buffers
  createBuffers() {
    const gl = this.gl;
    
    // Create a quad covering the entire canvas
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0
    ]);
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }
  
  // Resize renderer
  resize(width, height) {
    this.gl.viewport(0, 0, width, height);
  }
  
  // Render frame
  render(currentTime) {
    const gl = this.gl;
    const time = Date.now() - this.startTime;
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Update uniforms
    if (this.timeLocation !== null) {
      gl.uniform1f(this.timeLocation, time);
    }
    
    if (this.resolutionLocation !== null) {
      gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
    }
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

class ShaderGenerator {
  constructor() {
    this.patterns = [
      this.quantumTunnels,
      this.fractalUniverse,
      this.neuralNetwork,
      this.magneticFluids,
      this.hyperbolicGeometry,
      this.colorGradient,
      this.plasma,
      this.rays,
      this.tunnel,
      this.noise,
      this.cells
    ];
  }

// Preserve the original generate method
  generate() {
    const selectedPattern = this.patterns[Math.floor(Math.random() * this.patterns.length)];
    return selectedPattern.call(this);
  }

  // 4D Noise Projection
  quantumTunnels() {
    const warpSpeed = (Math.random() * 0.005 + 0.001).toFixed(4);
    const dimensionCount = Math.floor(Math.random() * 5) + 3;
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      // 4D Simplex Noise implementation
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      
      float snoise(vec4 v) {
        const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
        vec4 i = floor(v + dot(v, vec4(0.309016994374947451)) );
        vec4 x0 = v - i + dot(i, C.xxxx);
        // [complex 4D noise implementation continues...]
      }

      void main() {
        vec4 st = vec4(gl_FragCoord.xy/resolution.xy, time*0.001, time*0.0005);
        float pattern = 0.0;
        
        for(int i = 0; i < ${dimensionCount}; i++) {
          float fi = float(i);
          vec4 warp = vec4(
            sin(st.z * 0.3 + fi),
            cos(st.w * 0.4 + fi),
            sin(st.x * 0.5 + fi),
            cos(st.y * 0.6 + fi)
          );
          pattern += snoise(st * 8.0 + warp * 2.0) * 0.5;
          st.xy = mat2(cos(pattern), -sin(pattern), sin(pattern), cos(pattern)) * st.xy;
        }
        
        vec3 color = vec3(
          sin(pattern * 5.0 + time * ${warpSpeed}),
          cos(pattern * 3.0 + time * ${warpSpeed}),
          sin(pattern * 7.0 + time * ${warpSpeed})
        ) * 0.5 + 0.5;
        
        gl_FragColor = vec4(color * (1.0 - length(st.xy)), 1.0);
      }
    `;
  }

colorGradient() {
    const layers = Math.floor(Math.random() * 5) + 3;
    const noiseIntensity = (Math.random() * 0.3 + 0.1).toFixed(2);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      vec3 hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0)).x, hash(i + vec3(1,0,0)).x, f.x),
              mix(hash(i + vec3(0,1,0)).x, hash(i + vec3(1,1,0)).x, f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)).x, hash(i + vec3(1,0,1)).x, f.x),
              mix(hash(i + vec3(0,1,1)).x, hash(i + vec3(1,1,1)).x, f.x), f.y), f.z);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 color = vec3(0.0);
        
        for(int i = 0; i < ${layers}; i++) {
          float fi = float(i);
          vec3 p = vec3(uv * pow(2.0, fi), time * 0.001);
          float n = noise(p * 8.0) * ${noiseIntensity};
          
          vec3 grad = mix(
            vec3(sin(fi * 2.1), cos(fi * 3.7), sin(fi * 5.3)),
            vec3(cos(fi * 1.9), sin(fi * 4.2), cos(fi * 6.1)),
            length(uv - 0.5) + n
          );
          
          color = mix(color, grad, 0.5 + 0.5 * sin(time * 0.001 + fi));
        }
        
        gl_FragColor = vec4(pow(color, vec3(0.4545)), 1.0);
      }
    `;
  }

  plasma() {
    const octaves = Math.floor(Math.random() * 6) + 3;
    const interference = (Math.random() * 2.0 + 1.0).toFixed(1);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for(int i = 0; i < ${octaves}; i++) {
          value += amplitude * sin(p.x * 10.0 + time * 0.001) *
                              cos(p.y * 8.0 + time * 0.0012);
          p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv = uv * 2.0 - 1.0;
        
        vec3 color = vec3(0.0);
        float t = time * 0.001;
        
        for(int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 offset = vec2(sin(t * 0.5 + fi), cos(t * 0.7 + fi));
          color[i] = fbm(uv * ${interference} + offset) * 0.5 + 0.5;
        }
        
        color = mix(color, 1.0 - color, sin(t * 2.0));
        gl_FragColor = vec4(color * (1.0 - length(uv) * 0.3), 1.0);
      }
    `;
  }

  rays() {
    const rayCount = Math.floor(Math.random() * 30) + 20;
    const twistFactor = (Math.random() * 5.0 + 2.0).toFixed(1);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
        float angle = atan(uv.y, uv.x);
        float dist = length(uv);
        
        vec3 color = vec3(0.0);
        for(int i = 0; i < ${rayCount}; i++) {
          float fi = float(i);
          float rayAngle = fi * 6.2831 / float(${rayCount});
          float diff = mod(abs(angle - rayAngle), 6.2831);
          diff = min(diff, 6.2831 - diff);
          
          float intensity = 1.0 / (0.1 + 50.0 * diff * diff);
          intensity *= sin(dist * ${twistFactor} - time * 0.001 * fi) * 0.5 + 0.5;
          intensity *= exp(-dist * 3.0);
          
          color += hsv2rgb(vec3(fi / float(${rayCount}), 0.8, intensity)) * 0.5;
        }
        
        gl_FragColor = vec4(pow(color, vec3(0.4545)), 1.0);
      }
    `;
  }

  tunnel() {
    const recursionDepth = Math.floor(Math.random() * 8) + 5;
    const warpSpeed = (Math.random() * 0.005 + 0.001).toFixed(4);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }
      
      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
        vec3 color = vec3(0.0);
        float t = time * 0.001;
        
        for(int i = 0; i < ${recursionDepth}; i++) {
          float fi = float(i);
          uv = abs(uv) - 0.5;
          uv *= rot(t * 0.5 + fi * 0.2);
          uv *= 1.2;
          
          float d = length(uv) - 0.3;
          vec3 layer = vec3(
            sin(fi + t * 2.0),
            cos(fi + t * 1.5),
            sin(fi + t * 3.0)
          ) * exp(-d * 10.0);
          
          color += layer * (1.0 - fi / float(${recursionDepth}));
        }
        
        gl_FragColor = vec4(color * 2.0, 1.0);
      }
    `;
  }

  noise() {
    const dimensions = Math.floor(Math.random() * 3) + 2;
    const fractalLayers = Math.floor(Math.random() * 6) + 3;
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      // 3D Simplex Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        // ... full 3D simplex noise implementation ...
      }
      
      void main() {
        vec3 st = vec3(gl_FragCoord.xy / resolution.xy, time * 0.001);
        float n = 0.0;
        float amplitude = 1.0;
        
        for(int i = 0; i < ${fractalLayers}; i++) {
          n += amplitude * snoise(st * pow(2.0, float(i)));
          amplitude *= 0.5;
        }
        
        vec3 color = vec3(
          sin(n * 5.0),
          cos(n * 3.0),
          sin(n * 7.0)
        ) * 0.5 + 0.5;
        
        gl_FragColor = vec4(color * (1.0 - length(st.xy)), 1.0);
      }
    `;
  }

  cells() {
    const voronoiCells = Math.floor(Math.random() * 30) + 20;
    const displacement = (Math.random() * 0.1 + 0.05).toFixed(2);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      vec2 random2(vec2 p) {
        return fract(
          sin(vec2(
            dot(p, vec2(127.1, 311.7)),
            dot(p, vec2(269.5, 183.3))
          )) * 43758.5453
        );
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv.x *= resolution.x / resolution.y;
        
        vec2 grid = uv * float(${voronoiCells});
        vec2 iGrid = floor(grid);
        vec2 fGrid = fract(grid);
        
        float minDist = 1.0;
        vec3 color = vec3(0.0);
        
        for(int y = -1; y <= 1; y++) {
          for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(x, y);
            vec2 point = random2(iGrid + neighbor);
            point = 0.5 + 0.5 * sin(time * 0.001 + 6.2831 * point);
            vec2 diff = neighbor + point - fGrid;
            float dist = length(diff);
            
            if(dist < minDist) {
              minDist = dist;
              color = vec3(
                sin(time * 0.001 + point.x * 6.2831),
                cos(time * 0.001 + point.y * 6.2831),
                sin(time * 0.001 + (point.x + point.y) * 3.1416)
              ) * 0.5 + 0.5;
            }
          }
        }
        
        color *= smoothstep(0.0, ${displacement}, minDist);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  // Recursive Fractal Universe
  fractalUniverse() {
    const iterations = Math.floor(Math.random() * 15) + 10;
    const fractalPower = (Math.random() * 2.0 + 1.5).toFixed(2);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      vec3 palette(float t) {
        return vec3(
          0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
          0.5 + 0.5 * cos(6.28318 * (t + 0.4)),
          0.5 + 0.5 * cos(6.28318 * (t + 0.7))
        );
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        vec3 col = vec3(0.0);
        float d = length(uv);
        
        for(int i = 0; i < ${iterations}; i++) {
          uv = abs(uv * ${fractalPower}) - 0.7;
          uv = uv * mat2(cos(time*0.1), sin(time*0.1), -sin(time*0.1), cos(time*0.1));
          col += palette(length(uv*uv) + float(i)*0.4) * exp(-d*8.0);
        }
        
        col = pow(col, vec3(0.4545));
        gl_FragColor = vec4(col * 2.0, 1.0);
      }
    `;
  }

  // Artificial Neural Network Visualization
  neuralNetwork() {
    const layers = Math.floor(Math.random() * 8) + 4;
    const neuronCount = Math.floor(Math.random() * 50) + 30;
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      float sigmoid(float x) {
        return 1.0 / (1.0 + exp(-x));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float pattern = 0.0;
        
        for(int i = 0; i < ${layers}; i++) {
          float layer = float(i);
          for(int j = 0; j < ${neuronCount}; j++) {
            float neuron = float(j);
            vec2 weight = vec2(
              sin(layer * 12.9898 + neuron * 78.233),
              cos(layer * 4.898 + neuron * 97.7823)
            );
            float activation = sigmoid(
              sin(uv.x * weight.x * 10.0 + time * 0.001) *
              cos(uv.y * weight.y * 10.0 + time * 0.0012)
            );
            pattern += activation * 0.1;
          }
          uv = fract(uv * 2.0 + vec2(sin(time*0.001 + layer), cos(time*0.001 + layer)));
        }
        
        vec3 color = vec3(
          sin(pattern * 3.0),
          cos(pattern * 5.0),
          sin(pattern * 7.0)
        ) * 0.5 + 0.5;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  // Magnetic Fluid Dynamics Simulation
  magneticFluids() {
    const viscosity = (Math.random() * 0.1 + 0.01).toFixed(3);
    const fieldStrength = (Math.random() * 5.0 + 2.0).toFixed(1);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      vec2 complexMul(vec2 a, vec2 b) {
        return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
        vec2 c = uv * ${fieldStrength} - vec2(0.5, 0.0);
        vec2 z = vec2(sin(time * 0.001), cos(time * 0.001));
        vec3 col = vec3(0.0);
        
        for(int i = 0; i < 50; i++) {
          z = complexMul(z, z) + c;
          float d = dot(z, z);
          if(d > 4.0) {
            col = vec3(
              sin(float(i) * 0.3),
              cos(float(i) * 0.5),
              sin(float(i) * 0.7)
            );
            break;
          }
          z = z * (1.0 - ${viscosity}) + c * ${viscosity};
        }
        
        gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
      }
    `;
  }

  // Hyperbolic Geometry Projection
  hyperbolicGeometry() {
    const tessellation = Math.floor(Math.random() * 8) + 5;
    const curvature = (Math.random() * 0.3 + 0.1).toFixed(2);
    
    return `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      
      #define PI 3.14159265359
      
      vec2 hyperMap(vec2 p, float k) {
        float r = length(p);
        float theta = atan(p.y, p.x);
        return vec2(log(r), theta) * k;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
        uv = hyperMap(uv, ${curvature});
        
        float pattern = 0.0;
        for(int i = 0; i < ${tessellation}; i++) {
          float angle = 2.0 * PI * float(i) / float(${tessellation});
          vec2 dir = vec2(cos(angle), sin(angle));
          pattern += sin(dot(uv, dir) * 10.0 + time * 0.001) * 0.5 + 0.5;
        }
        
        vec3 color = vec3(
          sin(pattern * 2.0 + time * 0.001),
          cos(pattern * 3.0 + time * 0.0012),
          sin(pattern * 5.0 + time * 0.0008)
        ) * 0.5 + 0.5;
        
        gl_FragColor = vec4(color * (1.0 - length(uv)*0.1), 1.0);
      }
    `;
  }
}
// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  ShaderApp.init();
});