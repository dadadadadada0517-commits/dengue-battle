// ===== B 版：WebGL 3D 場景（地板、牆、雜物看板）＋ 攝影機繞場旋轉；人物維持 2D、近大遠小 =====
window.GL3D = (() => {
  const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080;
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: true });
  const VS = `attribute vec3 p; attribute vec2 uv; uniform mat4 M; varying vec2 v; varying vec3 wp; void main(){ v=uv; wp=p; gl_Position=M*vec4(p,1.0); }`;
  const FS = `precision mediump float; varying vec2 v; varying vec3 wp; uniform sampler2D T; uniform vec2 rep; uniform float dark;
    uniform vec3 lamp; uniform vec3 cam;
    void main(){ vec4 c = texture2D(T, fract(v*rep)); if (c.a < 0.5) discard;
      float d = distance(wp, cam); float fog = clamp((d-380.0)/700.0, 0.0, 0.55);
      float L = 1.0/(1.0 + pow(distance(wp, lamp)/170.0, 2.0));
      vec3 col = c.rgb * (0.55 + 0.25*dark) + c.rgb*vec3(1.0,0.62,0.3)*L*0.9 + vec3(0.02,0.05,0.12);
      col = mix(col, vec3(0.04,0.07,0.16), fog);
      gl_FragColor = vec4(col, 1.0); }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.log(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const loc = n => gl.getUniformLocation(pr, n), aP = gl.getAttribLocation(pr, 'p'), aU = gl.getAttribLocation(pr, 'uv');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aU); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(aU, 2, gl.FLOAT, false, 20, 12);
  gl.enable(gl.DEPTH_TEST);
  function tex(img, repeat) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const pow2 = (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
    if (pow2) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, pow2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  // ---- 矩陣 ----
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const persp = (f, asp, n, fa) => { const t = 1 / Math.tan(f / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]); };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lookAt = (e, c) => { const z = norm(sub(e, c)), x = norm(cross([0, 1, 0], z)), y = cross(z, x); return { m: new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]), x, y, z }; };
  const S = { tex: {}, props: [], M: null, cam: null, P: null, V: null, view: null, ready: false };
  const FOV = 34 * Math.PI / 180;
  function setCamera(yaw, pitch, dist, target) {
    const e = [target[0] + dist * Math.sin(yaw) * Math.cos(pitch), target[1] + dist * Math.sin(pitch), target[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
    S.view = lookAt(e, target); S.P = persp(FOV, 16 / 9, 10, 3000); S.M = mul(S.P, S.view.m); S.cam = e;
  }
  // 世界座標 → 螢幕（邏輯 640x360），並傳回透視縮放
  function project(x, y, z) { const m = S.M, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return { x: (cx / cw * .5 + .5) * 640, y: (1 - (cy / cw * .5 + .5)) * 360, s: 1 / cw, w: cw }; }
  function quad(T, pts, rep = [1, 1], dark = 1) { // pts: 4 個角 [x,y,z,u,v]
    const d = new Float32Array([...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, T); gl.uniform2f(loc('rep'), rep[0], rep[1]); gl.uniform1f(loc('dark'), dark); gl.drawArrays(gl.TRIANGLES, 0, 6); }
  async function init(SHEETS, loadImg, keyed, sliceSheet) {
    const L = async k => SHEETS[k] ? await loadImg(SHEETS[k]) : null;
    const fl = await L('floorB'), wa = await L('wallB'), pr2 = await L('propsB'), bg = await L('bgB');
    if (fl) S.tex.floor = tex(fl); if (wa) S.tex.wall = tex(wa); if (bg) S.tex.sky = tex(bg);
    if (pr2) { const rows = sliceSheet(pr2); rows.forEach(r => r.frames.forEach(f => { const w = f.ex - f.sx + 1, h = f.bot - f.top + 1, c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(r.src, f.sx, f.top, w, h, 0, 0, w, h); S.props.push({ t: tex(c), w, h }); })); }
    S.ready = !!(S.tex.floor && S.tex.wall);
  }
  // 場景配置（單位＝邏輯像素）
  const ARENA = { x0: -330, x1: 330, zb: -170, zf: 240 };
  const PROPS = [ // [道具索引, x, z, 高度]
    [0, 150, -150, 62], [1, 205, -152, 40], [2, 255, -150, 44], [3, -40, -155, 66], [4, -95, -150, 46], [5, 95, -140, 14], [6, -200, -150, 60], [7, 300, -150, 84], [3, -280, -100, 66], [6, 310, 30, 70], [8, 330, 120, 50], [5, 40, -142, 14]];
  function render(t) {
    if (!S.ready) return null;
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(.03, .05, .12, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(loc('M'), false, S.M); gl.uniform3f(loc('lamp'), -250, 120, -150); gl.uniform3f(loc('cam'), ...S.cam);
    const { x0, x1, zb, zf } = ARENA, WH = 230;
    // 遠景天空（背景大面板）
    if (S.tex.sky) quad(S.tex.sky, [[-1400, 900, -900, 0, 0], [1400, 900, -900, 1, 0], [1400, -60, -900, 1, .45], [-1400, -60, -900, 0, .45]], [1, 1], .4);
    quad(S.tex.floor, [[x0 - 200, 0, zb, 0, 0], [x1 + 200, 0, zb, 1, 0], [x1 + 200, 0, zf + 200, 1, 1], [x0 - 200, 0, zf + 200, 0, 1]], [3, 2.2]);
    quad(S.tex.wall, [[x0 - 120, WH, zb, 0, 0], [x1 + 120, WH, zb, 1, 0], [x1 + 120, 0, zb, 1, 1], [x0 - 120, 0, zb, 0, 1]]);
    quad(S.tex.wall, [[x0 - 120, WH, zf + 200, 0, 0], [x0 - 120, WH, zb, .35, 0], [x0 - 120, 0, zb, .35, 1], [x0 - 120, 0, zf + 200, 0, 1]], [1, 1], .7);
    // 雜物看板（永遠面向鏡頭）
    const r = S.view.x;
    const items = PROPS.filter(p => S.props[p[0]]).map(p => ({ p, d: project(p[1], 0, p[2]).w })).sort((a, b) => b.d - a.d);
    for (const { p: [i, x, z, h] } of items) { const pr3 = S.props[i], w = h * pr3.w / pr3.h, hx = r[0] * w / 2, hz = r[2] * w / 2;
      quad(pr3.t, [[x - hx, h, z - hz, 0, 0], [x + hx, h, z + hz, 1, 0], [x + hx, 0, z + hz, 1, 1], [x - hx, 0, z - hz, 0, 1]]); }
    return cv;
  }
  return { init, setCamera, project, render, S, ARENA, PROPS };
})();
