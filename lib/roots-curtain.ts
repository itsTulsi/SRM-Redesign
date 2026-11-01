/**
 * The curtain between acts, as a living root system: the previous act's colour retreats upward and leaves branching
 * roots glowing in the tree's green. Raw WebGL, one quad and one fragment shader, so nothing extra to download.
 * Draws only when scroll moves it, never while idle. Noise runs only in the band around the retreating edge.
 * createRootsCurtain returns null without WebGL; lib/motion-scenes then falls back to a plain wipe.
 */
const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAGMENT = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 u_res;
uniform float u_p;
uniform float u_seed;
uniform float u_scale;
uniform vec3 u_cover;
uniform vec3 u_root;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(11.3,7.1);a*=.5;}
  return v;
}
// A root runs where the noise crosses a level. Dividing by the slope gives distance in pixels, so a line keeps its
// width whether the noise is steep or flat. Without this, flat areas swell into blobs.
float line(float n,float level,float px){
  float d=abs(n-level)/max(length(vec2(dFdx(n),dFdy(n))),1e-4);
  return 1.-smoothstep(px*.5,px*.5+u_scale,d);
}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float y=1.-uv.y;
  float front=mix(1.22,-.72,u_p);
  // Solid above the edge and empty far below it: the noise is only worked out where it can be seen.
  if(y<front-.14){gl_FragColor=vec4(u_cover,1.);return;}
  if(y>front+.72){gl_FragColor=vec4(0.);return;}

  // Stretched tall so features run downward like roots, then warped so they wander and fork.
  vec2 q=vec2(uv.x*u_res.x/u_res.y,y);
  vec2 warp=vec2(fbm(q*vec2(2.4,.8)+u_seed),fbm(q*vec2(2.4,.8)+u_seed+7.));
  float n=fbm(vec2(q.x*2.8,q.y*.5)+warp*1.3+u_seed);
  float fine=fbm(vec2(q.x*6.5,q.y*1.1)+warp*1.9+u_seed*2.);

  float edge=y-front-(n-.5)*.42;
  float body=smoothstep(u_scale/u_res.y*1.5,-u_scale/u_res.y*1.5,edge);
  float depth=clamp(edge/.72,0.,1.);

  // Thick near the edge, thinning to nothing at the tips.
  float taper=1.-depth;
  float roots=line(n,.5,u_scale*(.4+2.6*taper*taper))*smoothstep(1.,.2,depth);
  roots=max(roots,line(fine,.5,u_scale*(.3+1.1*taper))*smoothstep(.62,.05,depth)*.8);
  roots=max(roots,line(n,.42,u_scale*(.3+1.2*taper))*smoothstep(.8,.1,depth)*.7);

  // The growth front along the retreating edge, with a soft glow that dies away below it.
  float rim=1.-smoothstep(0.,u_scale/u_res.y*3.,abs(edge));
  float glow=exp(-max(edge,0.)*26.)*.3*(1.-body);

  vec3 color=mix(u_cover,u_root,max(rim,roots*(1.-body)));
  float alpha=max(max(body,rim),max(roots,glow));
  color=mix(u_root,color,max(max(body,rim),roots));
  gl_FragColor=vec4(color*alpha,alpha);
}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.trim().replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export type RootsCurtain = {
  /** Moves the canvas into this curtain and draws it at progress 0 (fully covered) to 1 (gone). */
  draw: (curtain: HTMLElement, progress: number, seed: number) => void;
  /** True once the browser has taken the WebGL context away; callers fall back to the plain wipe. */
  lost: () => boolean;
  destroy: () => void;
};

export function createRootsCurtain(): RootsCurtain | null {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  // failIfMajorPerformanceCaveat: no GPU means software rendering, too slow for this; those devices get the plain wipe.
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return null;

  if (!gl.getExtension("OES_standard_derivatives")) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uRes = uniform("u_res");
  const uP = uniform("u_p");
  const uSeed = uniform("u_seed");
  const uScale = uniform("u_scale");
  const uCover = uniform("u_cover");
  gl.uniform3fv(uniform("u_root"), hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--leaf-green-300")));

  let isLost = false;
  canvas.addEventListener("webglcontextlost", () => {
    isLost = true;
  });

  return {
    draw(curtain, progress, seed) {
      if (isLost) return;
      if (canvas.parentElement !== curtain) {
        curtain.append(canvas);
        gl.uniform3fv(uCover, hexToRgb(getComputedStyle(curtain).getPropertyValue("--curtain")));
      }
      // Capped: on a phone's 3x screen, 1x already looks soft and glowing, and costs a ninth of the pixels.
      const scale = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.5);
      const width = Math.round(curtain.clientWidth * scale);
      const height = Math.round(curtain.clientHeight * scale);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uP, progress);
      gl.uniform1f(uSeed, seed);
      gl.uniform1f(uScale, scale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    lost: () => isLost,
    destroy() {
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
