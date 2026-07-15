// 全屏片元着色器：程序化天气/极光背景。
// uniforms:
//   uTime     - 运行时间(秒)
//   uDayNight - 0=白天, 1=夜晚
//   uWeather  - 0=晴,1=多云,2=雨,3=雪,4=雾,5=雷暴
//   uResolution
//   uMouse    - 鼠标归一化坐标(0~1)
//   uScroll   - 整页滚动归一化进度 0~1
export const weatherVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const weatherFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uDayNight;
  uniform float uWeather;
  uniform vec2  uResolution;
  uniform vec2  uMouse;
  uniform float uScroll;

  // ---- 噪声工具 ----
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  // 流动的云层
  float clouds(vec2 uv, float t) {
    vec2 q = uv * vec2(3.0, 1.5);
    q.x += t * 0.02;
    float c = fbm(q);
    c += fbm(q * 2.0 + t * 0.03) * 0.5;
    return smoothstep(0.4, 0.9, c);
  }

  // 雨丝
  float rain(vec2 uv, float t) {
    uv *= vec2(60.0, 1.0);
    uv.y += t * 6.0;
    uv.x += uv.y * 0.3;
    vec2 id = floor(uv);
    float r = hash21(id);
    float drop = step(0.92, r + 0.04);
    return drop;
  }

  // 雪花
  float snow(vec2 uv, float t) {
    vec2 q = uv * vec2(40.0, 40.0);
    q.y -= t * 1.2;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float r = hash21(id);
    f.x += (r - 0.5) * 0.6;
    f.y += sin(t * 0.5 + r * 6.28) * 0.1;
    float d = length(f);
    return smoothstep(0.35, 0.0, d) * step(0.7, r);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float t = uTime;
    float sp = uScroll;

    // 鼠标微视差 + 滚动视差（向下滚背景上移）
    vec2 m = (uMouse - 0.5) * 0.06;
    p -= m;
    p.y += sp * 0.3;

    // 白天/夜晚调色板：北卡蓝低饱和
    vec3 dayTop    = vec3(0.70, 0.82, 0.93);
    vec3 dayBot    = vec3(0.92, 0.95, 0.99);
    vec3 nightTop  = vec3(0.04, 0.08, 0.18);
    vec3 nightBot  = vec3(0.07, 0.14, 0.28);
    vec3 topC = mix(dayTop, nightTop, uDayNight);
    vec3 botC = mix(dayBot, nightBot, uDayNight);

    // 极光式渐变底
    float grad = smoothstep(0.0, 1.0, p.y * 0.5 + 0.5);
    vec3 col = mix(botC, topC, grad);
    // 滚动越深，整体越沉，强化电影感
    col *= 1.0 - sp * 0.18;

    // 柔和流动光晕(极光感)：低饱和蓝
    float halo = fbm(p * 1.2 + vec2(t * 0.03, t * 0.02));
    vec3 haloDay   = vec3(0.45, 0.62, 0.85);
    vec3 haloNight = vec3(0.18, 0.32, 0.55);
    vec3 haloC = mix(haloDay, haloNight, uDayNight);
    col += haloC * pow(halo, 2.0) * 0.22;

    // 太阳 / 月亮：弱化，不喧宾夺主
    vec2 sunPos = vec2(0.55, 0.35) + m;
    float sun = smoothstep(0.06, 0.0, length(p - vec2(0.45, 0.18)));
    vec3 sunC = mix(vec3(1.0, 0.95, 0.82), vec3(0.85, 0.92, 1.0), uDayNight);
    col += sunC * sun * 0.5;

    // 云
    float cloudAmt = clouds(uv + m, t);
    // 多云/雷暴云更多，晴朗最少
    float cloudTarget = 0.18;
    cloudTarget += step(0.5, uWeather) * 0.4;         // 多云以上
    cloudTarget += step(4.5, uWeather) * 0.25;       // 雾
    float cMix = clamp(cloudTarget * cloudAmt, 0.0, 1.0);
    vec3 cloudC = mix(vec3(1.0), haloC * 1.2, uDayNight * 0.5);
    col = mix(col, cloudC, cMix * 0.55);

    // 雨
    float weatherRain = step(1.5, uWeather) * (1.0 - step(2.5, uWeather))  // 雨
                      + step(4.5, uWeather);                               // 雷暴也有雨
    float r = rain(uv, t) * weatherRain;
    col = mix(col, vec3(0.6, 0.7, 0.9), r * 0.6);

    // 雪
    float weatherSnow = step(2.5, uWeather) * (1.0 - step(3.5, uWeather));
    float s = snow(uv, t) * weatherSnow;
    col = mix(col, vec3(1.0), s);

    // 雾
    float weatherFog = step(3.5, uWeather) * (1.0 - step(4.5, uWeather));
    float fog = fbm(uv * 4.0 + t * 0.05) * weatherFog;
    col = mix(col, vec3(0.8, 0.85, 0.95) * (1.0 - uDayNight * 0.5), fog * 0.6);

    // 雷暴闪光
    float weatherStorm = step(4.5, uWeather);
    float flash = step(0.985, sin(t * 3.0) * 0.5 + 0.5) * weatherStorm;
    col += vec3(1.0) * flash * 0.5;

    // 暗角：更柔和
    float vig = smoothstep(1.4, 0.35, length(p));
    col *= 0.82 + 0.18 * vig;

    // 微粒颗粒：更弱
    float grain = hash21(gl_FragCoord.xy + t) * 0.02;
    col += grain - 0.01;

    gl_FragColor = vec4(col, 1.0);
  }
`
