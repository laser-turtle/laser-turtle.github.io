const FPS = 60;
const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"

canvas.width = 400
canvas.height = 400

const ctx = canvas.getContext("2d")

function clear() {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.width)
}

function point({ x, y }) {
  const s = 20
  ctx.fillStyle = FOREGROUND
  ctx.fillRect(x - s / 2, y - s / 2, s, s)
}

function line(p1, p2) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = FOREGROUND
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function screen(p) {
  // -1..1 => 0..2 => 0..1 => 0..w
  return {
    x: (p.x + 1) / 2 * canvas.width,
    y: (1 - (p.y + 1) / 2) * canvas.height,
  }
}

function project({ x, y, z }) {
  return {
    x: x / z,
    y: y / z,
  }
}

function translate_z({ x, y, z }, dz) {
  return { x, y, z: z + dz };
}

function rotate_xz({ x, y, z }, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: x * c - z * s,
    y,
    z: x * s + z * c,
  };
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function edge(v0, v1, p) {
  const va = sub(p, v0)
  const vb = sub(v1, v0)
  return cross(va, vb)
}

function putPixel({ x, y }, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1)
}

function bounds({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }) {
  return {
    x0: Math.min(x1, Math.min(x2, x3)) | 0,
    y0: Math.min(y1, Math.min(y2, y3)) | 0,
    x1: Math.max(x1, Math.max(x2, x3)) | 0,
    y1: Math.max(y1, Math.max(y2, y3)) | 0
  }
}

function dot3D(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross3D(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

function sub3D(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
}

function length3D(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize3D(v) {
  const l = length3D(v)
  return {
    x: v.x / l,
    y: v.y / l,
    z: v.z / l
  }
}

function normal(v0, v1, v2) {
  const e1 = sub3D(v2, v0)
  const e2 = sub3D(v1, v0)
  return normalize3D(cross3D(e1, e2))
}

function backfacing(eye, v0, N) {
  const D = sub3D(v0, eye)
  return dot3D(D, N) < 0
}

const createDepthBuffer = (width, height) => {
  const depthBuffer = new Float32Array(width * height)

  return {
    clear: () => {
      for (let i = 0; i < depthBuffer.length; ++i) {
        depthBuffer[i] = 1000.0
      }
    },
    getValue: (x, y) => depthBuffer[y * width + x],
    setValue: (x, y, v) => depthBuffer[y * width + x] = v,
  }
}

const depthBuffer = createDepthBuffer(canvas.width, canvas.height)

let dz = 1;
let angle = Math.PI;

function frame() {
  const dt = 1 / FPS;
  angle += Math.PI / 4 * dt;

  clear()
  depthBuffer.clear()

  const start = performance.now()

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = img.data

  const cameraP = { x: 0, y: 0, z: 0 }

  const transform3D = (pt) => {
    return translate_z(rotate_xz(pt, angle), dz)
  }

  const transform2D = (pt) => {
    return screen(project(pt));
  }

  for (const f of fs) {
    // 3D triangle
    const v0_3d = transform3D(vs[f[0]])
    const v1_3d = transform3D(vs[f[1]])
    const v2_3d = transform3D(vs[f[2]])

    const N = normal(v0_3d, v1_3d, v2_3d)

    if (backfacing(cameraP, v0_3d, N)) {
      continue;
    }

    // Screen Triangle
    const v0 = transform2D(v0_3d)
    const v1 = transform2D(v1_3d)
    const v2 = transform2D(v2_3d)

    // Fill in the triangle, with some overdraw
    const { x0, y0, x1, y1 } = bounds(v0, v1, v2)
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1

    // Degenerate
    if (w <= 0 || h <= 0) {
      continue;
    }

    for (let y = y0; y <= y1; ++y) {
      for (let x = x0; x <= x1; ++x) {
        const p = { x, y }

        // Check if inside triangle
        const e10 = edge(v1, v0, p)
        const e21 = edge(v2, v1, p)
        const e02 = edge(v0, v2, p)

        if (e10 >= 0 && e21 >= 0 && e02 >= 0) {
          // Barycentric weighting to unproject
          const area = e10 + e21 + e02
          const w0 = e21 / area
          const w1 = e02 / area
          const w2 = e10 / area

          const z0 = v0_3d.z
          const z1 = v1_3d.z
          const z2 = v2_3d.z

          const invZ = w0 / z0 + w1 / z1 + w2 / z2
          const depth = 1 / invZ

          const p_3d = {
            x: (w0 * v0_3d.x / z0 + w1 * v1_3d.x / z1 + w2 * v2_3d.x / z2) * depth,
            y: (w0 * v0_3d.y / z0 + w1 * v1_3d.y / z1 + w2 * v2_3d.y / z2) * depth,
            z: depth
          }

          const lightDir1 = normalize3D({ x: -1, y: -1, z: 0 })
          const lightDir2 = normalize3D({ x: 1, y: -1, z: 1 })
          const intensity = Math.max(0.2,
            dot3D(N, lightDir1) + dot3D(N, lightDir2) * 0.5
          )

          const currentDepth = depthBuffer.getValue(x, y)
          if (currentDepth < depth) {
            continue;
          }
          depthBuffer.setValue(x, y, depth)


          let c = (intensity * 255) | 0

          const idx = (y * canvas.width + x) * 4
          data[idx + 0] = c
          data[idx + 1] = c
          data[idx + 2] = c
          data[idx + 3] = 0xFF
        }
      }
    }
  }

  const end = performance.now()

  ctx.putImageData(img, 0, 0)
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame)
