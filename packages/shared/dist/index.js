import { stalker as ce, csvStorage as ae, tableStorage as de } from "@mono424/stalker-ts";
export * from "@mono424/stalker-ts";
import { createSignal as A, onCleanup as se, sharedConfig as B, createMemo as ue, createRenderEffect as X, createComponent as D } from "solid-js";
import { vec3 as $, mat4 as P, vec4 as Y } from "wgpu-matrix";
import { Loader as ie, Download as fe, Check as he, X as ve, Settings as pe, Circle as me, Bomb as ge, ArrowDown as ye, ChevronUp as be, ChevronDown as we, Box as xe, Play as $e, Square as Ae } from "lucide-solid";
function R(...e) {
  return e.filter(Boolean).join(" ");
}
let ee = "app";
const Je = (e) => {
  ee = e;
}, Qe = () => ee;
let Q = null;
const Se = (e) => {
  const n = ae({
    callback: e
  }), t = de();
  return {
    saveSessions: async (a) => {
      n.saveSessions([...a]), t.saveSessions([...a]);
    }
  };
}, _e = (e) => (Q || (Q = ce(Se(e))), Q), Ce = (e) => `${ee}_${e}_${Date.now()}`;
function Ze() {
  const [e, n] = A({
    eye: $.fromValues(5, 3, -5),
    lookAt: $.fromValues(0, 0, 0),
    up: $.fromValues(0, 0, -1),
    fov: Math.PI / 3,
    aspect: 1,
    near: 0.1,
    far: 50
  }), [t, a] = A(P.create()), [l, c] = A(
    P.create()
  ), [d, o] = A(
    P.create()
  ), [s, i] = A(Y.create()), [h, u] = A(Y.create()), [v, S] = A(0), M = () => {
    const { fov: p, aspect: m, near: g, far: _ } = e(), f = P.perspective(p, m, g, _);
    c(f);
  }, b = () => {
    const { eye: p, lookAt: m, up: g } = e(), _ = P.lookAt(p, m, g);
    a(_);
    const f = P.transpose(_);
    i(
      Y.fromValues(f[8], f[9], f[10], 1)
    ), u(
      Y.fromValues(f[0], f[1], f[2], 1)
    );
  }, C = () => {
    const p = P.multiply(l(), t());
    o(p);
  }, j = (p) => {
    Object.keys(p).every(
      (m) => p[m] === e()[m]
    ) || (n({
      ...e(),
      ...p
    }), b(), M(), C());
  }, k = (p, m) => {
    const { eye: g, lookAt: _, up: f } = e(), r = Y.fromValues(g[0], g[1], g[2], 1), w = Y.fromValues(_[0], _[1], _[2], 1), x = P.rotate(P.identity(), f, p);
    P.mul(x, Y.sub(r, w), r), Y.add(r, w, r);
    const E = P.rotate(P.identity(), h(), m);
    P.mul(E, Y.sub(r, w), r), Y.add(r, w, r), n({
      ...e(),
      eye: $.fromValues(r[0], r[1], r[2])
    }), b(), C();
  }, V = () => {
    const { lookAt: p, eye: m } = e();
    S($.distance(p, m));
  }, N = (p) => {
    if (p < 0.5)
      return;
    const { lookAt: m } = e(), g = $.add(
      m,
      $.scale($.normalize(s()), p)
    );
    n({
      ...e(),
      eye: g
    }), V(), b(), C();
  }, L = (p, m) => {
    const { eye: g, lookAt: _, up: f } = e(), r = $.normalize($.subtract(_, g)), w = $.normalize($.cross(r, f)), x = $.normalize($.cross(w, r)), z = $.distance(g, _) * 1e-3, K = $.scale(w, p * z), q = $.scale(x, -m * z), U = $.add(K, q), H = $.add(g, U), G = $.add(_, U);
    n({
      ...e(),
      eye: H,
      lookAt: G
    }), b(), C();
  };
  return V(), b(), M(), C(), {
    setContext: j,
    viewMatrix: t,
    projectionMatrix: l,
    viewProjectionMatrix: d,
    rotateAroundPivotPoint: k,
    setLookAtDistance: N,
    distance: v,
    panCamera: L
  };
}
const et = ({ name: e }) => {
  const [n, t] = A([]), [a, l] = A(0), [c, d] = A(0), [o, s] = A(0), [i, h] = A(0), [u, v] = A(0), [S, M] = A(0), [b, C] = A(null), j = async ({
    stalker: p,
    seconds: m
  }) => {
    if (b())
      throw new Error("Stalker session already started");
    const g = p.startSession(Ce(e));
    return C(g), new Promise(
      (_) => setTimeout(() => {
        C(null), g.endSession(), _();
      }, m * 1e3)
    );
  }, k = (p) => {
    t((g) => [...g, p].slice(-100)), l(p), d(n().reduce((g, _) => g + _, 0) / n().length);
    const m = b();
    m && m.addEvent("fps", { fps: p });
  };
  let V = new Promise((p) => p());
  return {
    fps: a,
    avgFps: c,
    frameCount: o,
    lastFrameTime: i,
    lastFrameTimestamp: u,
    updateFps: async (p = performance.now()) => {
      await V, V = new Promise((m) => {
        const g = performance.now(), _ = g - i();
        if (_ < 50) {
          M((w) => w + 1), m();
          return;
        }
        const f = 1 + S();
        M(0), s((w) => w + f);
        const r = 1e3 / _ * f;
        k(r), h(g), v(p), m();
      });
    },
    setFps: k,
    startStalkerSession: j,
    emitEvent: (p, m) => {
      const g = b();
      g && g.addEvent(p, m);
    }
  };
};
function tt(e) {
  let n = !1, t = !1, a = 0, l = 0, c = 0, d = 0, o = 0, s = 0, i = null, h = 0, u = 0, v = null;
  const S = (f) => {
    const r = f;
    r.preventDefault(), (r.metaKey || r.ctrlKey || r.button === 0) && (t = r.metaKey || r.ctrlKey, n = !0, a = r.clientX, l = r.clientY, i && (i.style.cursor = "grabbing"));
  }, M = (f) => {
    const r = f;
    if (!n) return;
    const w = r.clientX - a, x = r.clientY - l;
    if (t)
      e.panCamera(w, x);
    else {
      const z = w * 5e-3, K = x * 5e-3;
      e.rotateAroundPivotPoint(z, K);
    }
    a = r.clientX, l = r.clientY;
  }, b = () => {
    n = !1, t = !1, i && (i.style.cursor = "grab");
  }, C = (f) => {
    const r = f;
    r.preventDefault();
    const x = r.deltaY * 1e-3, E = e.distance();
    e.setLookAtDistance(E + x);
  }, j = (f) => {
    const r = f;
    r.preventDefault(), r.metaKey || r.ctrlKey ? m() : g();
  }, k = (f) => {
    const r = f;
    r.preventDefault();
    const w = Date.now();
    if (r.touches.length === 1)
      u++, v && (clearTimeout(v), v = null), u === 1 ? v = window.setTimeout(() => {
        u = 0;
      }, 300) : u === 2 && w - h < 300 && (L(r.touches[0]), u = 0, v && (clearTimeout(v), v = null)), h = w, n = !0, a = r.touches[0].clientX, l = r.touches[0].clientY;
    else if (r.touches.length === 2) {
      const x = r.touches[0], E = r.touches[1];
      c = Math.sqrt(
        Math.pow(E.clientX - x.clientX, 2) + Math.pow(E.clientY - x.clientY, 2)
      ), d = e.distance(), o = (x.clientX + E.clientX) / 2, s = (x.clientY + E.clientY) / 2, t = !0, n = !1, u = 0;
    }
  }, V = (f) => {
    const r = f;
    if (r.preventDefault(), r.touches.length === 1 && n && !t) {
      const w = r.touches[0].clientX - a, x = r.touches[0].clientY - l, E = 5e-3, z = w * E, K = x * E;
      e.rotateAroundPivotPoint(z, K), a = r.touches[0].clientX, l = r.touches[0].clientY;
    } else if (r.touches.length === 2 && t) {
      const w = r.touches[0], x = r.touches[1], E = Math.sqrt(
        Math.pow(x.clientX - w.clientX, 2) + Math.pow(x.clientY - w.clientY, 2)
      ), z = c / E, K = Math.max(
        0.5,
        Math.min(50, d * z)
      );
      e.setLookAtDistance(K);
      const q = (w.clientX + x.clientX) / 2, U = (w.clientY + x.clientY) / 2, H = q - o, G = U - s;
      if (Math.abs(H) > 5 || Math.abs(G) > 5) {
        const le = H * 2e-3, re = G * 2e-3;
        e.rotateAroundPivotPoint(le, re), o = q, s = U;
      }
    }
  }, N = (f) => {
    const r = f;
    r.preventDefault(), r.touches.length < 2 && (t = !1), r.touches.length === 0 && (n = !1);
  }, L = (f) => {
    g();
  }, p = (f) => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA")
      return;
    const r = 0.1, w = 0.5;
    switch (f.code) {
      case "ArrowUp":
      case "KeyW":
        f.preventDefault(), e.rotateAroundPivotPoint(0, -r);
        break;
      case "ArrowDown":
      case "KeyS":
        f.preventDefault(), e.rotateAroundPivotPoint(0, r);
        break;
      case "ArrowLeft":
      case "KeyA":
        f.preventDefault(), e.rotateAroundPivotPoint(-r, 0);
        break;
      case "ArrowRight":
      case "KeyD":
        f.preventDefault(), e.rotateAroundPivotPoint(r, 0);
        break;
      case "Equal":
      // Plus key
      case "NumpadAdd":
        if (f.ctrlKey || f.metaKey) {
          f.preventDefault();
          const x = e.distance();
          e.setLookAtDistance(Math.max(0.5, x - w));
        }
        break;
      case "Minus":
      case "NumpadSubtract":
        if (f.ctrlKey || f.metaKey) {
          f.preventDefault();
          const x = e.distance();
          e.setLookAtDistance(Math.min(50, x + w));
        }
        break;
      case "Digit0":
      case "Numpad0":
        (f.ctrlKey || f.metaKey) && (f.preventDefault(), m());
        break;
      case "KeyR":
        f.preventDefault(), m();
        break;
      case "KeyF":
        f.preventDefault(), g();
        break;
    }
  }, m = () => {
    e.setContext({
      eye: $.fromValues(5, 3, -5),
      lookAt: $.fromValues(0, 0, 0),
      up: $.fromValues(0, 0, -1),
      fov: Math.PI / 3,
      aspect: 1,
      near: 0.1,
      far: 50
    });
  }, g = () => {
    e.setLookAtDistance(8);
  };
  return {
    init: (f) => {
      i = f, i.addEventListener("mousedown", S), i.addEventListener("mousemove", M), i.addEventListener("mouseup", b), i.addEventListener("mouseleave", b), i.addEventListener("wheel", C), i.addEventListener("dblclick", j), i.addEventListener("touchstart", k), i.addEventListener("touchmove", V), i.addEventListener("touchend", N), i.addEventListener("touchcancel", N), document.addEventListener("keydown", p), i.style.cursor = "grab", se(() => {
        i && (i.removeEventListener("mousedown", S), i.removeEventListener("mousemove", M), i.removeEventListener("mouseup", b), i.removeEventListener("mouseleave", b), i.removeEventListener("wheel", C), i.removeEventListener("dblclick", j), i.removeEventListener("touchstart", k), i.removeEventListener("touchmove", V), i.removeEventListener("touchend", N), i.removeEventListener("touchcancel", N)), document.removeEventListener("keydown", p), v && clearTimeout(v);
      });
    },
    resetView: m,
    zoomToFit: g
  };
}
const F = (e) => ue(() => e());
function De(e, n, t) {
  let a = t.length, l = n.length, c = a, d = 0, o = 0, s = n[l - 1].nextSibling, i = null;
  for (; d < l || o < c; ) {
    if (n[d] === t[o]) {
      d++, o++;
      continue;
    }
    for (; n[l - 1] === t[c - 1]; )
      l--, c--;
    if (l === d) {
      const h = c < a ? o ? t[o - 1].nextSibling : t[c - o] : s;
      for (; o < c; ) e.insertBefore(t[o++], h);
    } else if (c === o)
      for (; d < l; )
        (!i || !i.has(n[d])) && n[d].remove(), d++;
    else if (n[d] === t[c - 1] && t[o] === n[l - 1]) {
      const h = n[--l].nextSibling;
      e.insertBefore(t[o++], n[d++].nextSibling), e.insertBefore(t[--c], h), n[l] = t[c];
    } else {
      if (!i) {
        i = /* @__PURE__ */ new Map();
        let u = o;
        for (; u < c; ) i.set(t[u], u++);
      }
      const h = i.get(n[d]);
      if (h != null)
        if (o < h && h < c) {
          let u = d, v = 1, S;
          for (; ++u < l && u < c && !((S = i.get(n[u])) == null || S !== h + v); )
            v++;
          if (v > h - o) {
            const M = n[d];
            for (; o < h; ) e.insertBefore(t[o++], M);
          } else e.replaceChild(t[o++], n[d++]);
        } else d++;
      else n[d++].remove();
    }
  }
}
const ne = "_$DX_DELEGATE";
function T(e, n, t, a) {
  let l;
  const c = () => {
    const o = document.createElement("template");
    return o.innerHTML = e, o.content.firstChild;
  }, d = () => (l || (l = c())).cloneNode(!0);
  return d.cloneNode = d, d;
}
function J(e, n = window.document) {
  const t = n[ne] || (n[ne] = /* @__PURE__ */ new Set());
  for (let a = 0, l = e.length; a < l; a++) {
    const c = e[a];
    t.has(c) || (t.add(c), n.addEventListener(c, Me));
  }
}
function Ee(e, n, t) {
  te(e) || (t == null ? e.removeAttribute(n) : e.setAttribute(n, t));
}
function I(e, n) {
  te(e) || (n == null ? e.removeAttribute("class") : e.className = n);
}
function y(e, n, t, a) {
  if (t !== void 0 && !a && (a = []), typeof n != "function") return W(e, n, a, t);
  X((l) => W(e, n(), l, t), a);
}
function te(e) {
  return !!B.context && !B.done && (!e || e.isConnected);
}
function Me(e) {
  if (B.registry && B.events && B.events.find(([s, i]) => i === e))
    return;
  let n = e.target;
  const t = `$$${e.type}`, a = e.target, l = e.currentTarget, c = (s) => Object.defineProperty(e, "target", {
    configurable: !0,
    value: s
  }), d = () => {
    const s = n[t];
    if (s && !n.disabled) {
      const i = n[`${t}Data`];
      if (i !== void 0 ? s.call(n, i, e) : s.call(n, e), e.cancelBubble) return;
    }
    return n.host && typeof n.host != "string" && !n.host._$host && n.contains(e.target) && c(n.host), !0;
  }, o = () => {
    for (; d() && (n = n._$host || n.parentNode || n.host); ) ;
  };
  if (Object.defineProperty(e, "currentTarget", {
    configurable: !0,
    get() {
      return n || document;
    }
  }), B.registry && !B.done && (B.done = _$HY.done = !0), e.composedPath) {
    const s = e.composedPath();
    c(s[0]);
    for (let i = 0; i < s.length - 2 && (n = s[i], !!d()); i++) {
      if (n._$host) {
        n = n._$host, o();
        break;
      }
      if (n.parentNode === l)
        break;
    }
  } else o();
  c(a);
}
function W(e, n, t, a, l) {
  const c = te(e);
  if (c) {
    !t && (t = [...e.childNodes]);
    let s = [];
    for (let i = 0; i < t.length; i++) {
      const h = t[i];
      h.nodeType === 8 && h.data.slice(0, 2) === "!$" ? h.remove() : s.push(h);
    }
    t = s;
  }
  for (; typeof t == "function"; ) t = t();
  if (n === t) return t;
  const d = typeof n, o = a !== void 0;
  if (e = o && t[0] && t[0].parentNode || e, d === "string" || d === "number") {
    if (c || d === "number" && (n = n.toString(), n === t))
      return t;
    if (o) {
      let s = t[0];
      s && s.nodeType === 3 ? s.data !== n && (s.data = n) : s = document.createTextNode(n), t = O(e, t, a, s);
    } else
      t !== "" && typeof t == "string" ? t = e.firstChild.data = n : t = e.textContent = n;
  } else if (n == null || d === "boolean") {
    if (c) return t;
    t = O(e, t, a);
  } else {
    if (d === "function")
      return X(() => {
        let s = n();
        for (; typeof s == "function"; ) s = s();
        t = W(e, s, t, a);
      }), () => t;
    if (Array.isArray(n)) {
      const s = [], i = t && Array.isArray(t);
      if (Z(s, n, t, l))
        return X(() => t = W(e, s, t, a, !0)), () => t;
      if (c) {
        if (!s.length) return t;
        if (a === void 0) return t = [...e.childNodes];
        let h = s[0];
        if (h.parentNode !== e) return t;
        const u = [h];
        for (; (h = h.nextSibling) !== a; ) u.push(h);
        return t = u;
      }
      if (s.length === 0) {
        if (t = O(e, t, a), o) return t;
      } else i ? t.length === 0 ? oe(e, s, a) : De(e, t, s) : (t && O(e), oe(e, s));
      t = s;
    } else if (n.nodeType) {
      if (c && n.parentNode) return t = o ? [n] : n;
      if (Array.isArray(t)) {
        if (o) return t = O(e, t, a, n);
        O(e, t, null, n);
      } else t == null || t === "" || !e.firstChild ? e.appendChild(n) : e.replaceChild(n, e.firstChild);
      t = n;
    }
  }
  return t;
}
function Z(e, n, t, a) {
  let l = !1;
  for (let c = 0, d = n.length; c < d; c++) {
    let o = n[c], s = t && t[e.length], i;
    if (!(o == null || o === !0 || o === !1)) if ((i = typeof o) == "object" && o.nodeType)
      e.push(o);
    else if (Array.isArray(o))
      l = Z(e, o, s) || l;
    else if (i === "function")
      if (a) {
        for (; typeof o == "function"; ) o = o();
        l = Z(e, Array.isArray(o) ? o : [o], Array.isArray(s) ? s : [s]) || l;
      } else
        e.push(o), l = !0;
    else {
      const h = String(o);
      s && s.nodeType === 3 && s.data === h ? e.push(s) : e.push(document.createTextNode(h));
    }
  }
  return l;
}
function oe(e, n, t = null) {
  for (let a = 0, l = n.length; a < l; a++) e.insertBefore(n[a], t);
}
function O(e, n, t, a) {
  if (t === void 0) return e.textContent = "";
  const l = a || document.createTextNode("");
  if (n.length) {
    let c = !1;
    for (let d = n.length - 1; d >= 0; d--) {
      const o = n[d];
      if (l !== o) {
        const s = o.parentNode === e;
        !c && !d ? s ? e.replaceChild(l, o) : e.insertBefore(l, t) : s && o.remove();
      } else c = !0;
    }
  } else e.insertBefore(l, t);
  return [l];
}
var ke = /* @__PURE__ */ T('<button class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">');
const Te = ({
  getMetricsCsv: e,
  disabled: n
}) => {
  const [t, a] = A(!1), l = () => {
    a(!0);
    try {
      const c = e();
      if (!c) {
        console.warn("No metrics data available to download");
        return;
      }
      const d = new Blob([c], {
        type: "text/csv;charset=utf-8;"
      }), o = document.createElement("a"), s = URL.createObjectURL(d);
      o.setAttribute("href", s), o.setAttribute("download", `metrics_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.csv`), o.style.visibility = "hidden", document.body.appendChild(o), o.click(), document.body.removeChild(o), URL.revokeObjectURL(s);
    } catch (c) {
      console.error("Error downloading metrics:", c);
    } finally {
      a(!1);
    }
  };
  return (() => {
    var c = ke();
    return c.$$click = l, y(c, (() => {
      var d = F(() => !!t());
      return () => d() ? D(ie, {
        size: 16,
        class: "animate-spin"
      }) : D(fe, {
        size: 16
      });
    })()), X(() => c.disabled = t() || n()), c;
  })();
};
J(["click"]);
var Le = /* @__PURE__ */ T('<div class="flex gap-2"><button class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">');
const nt = ({
  startStalkerSessionTriggers: e,
  serverCsv: n,
  onStartMetricRecording: t,
  seconds: a
}) => {
  const [l, c] = A(!1), [d, o] = A(""), s = async () => {
    c(!0), o("");
    const h = await _e((u) => {
      o((v) => v ? `${v}
${u}` : u);
    });
    t?.(), await Promise.all(e().map((u) => u({
      seconds: a(),
      stalker: h
    }))), c(!1);
  }, i = () => {
    const h = d(), u = n?.();
    return u ? `-- Client Metrics --
${h}

-- Server Metrics --
${u}` : h;
  };
  return (() => {
    var h = Le(), u = h.firstChild;
    return u.$$click = s, y(u, () => l() ? "Recording..." : "Record Metrics"), y(h, D(Te, {
      disabled: () => l() || !d(),
      getMetricsCsv: i
    }), null), X(() => u.disabled = l()), h;
  })();
};
J(["click"]);
var Pe = /* @__PURE__ */ T('<div class="flex flex-col items-center my-2"><div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10">'), je = /* @__PURE__ */ T('<div><div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div><div class="w-[2px] h-4 my-[-2px] bg-gray-800 rounded-full"></div><div class="flex justify-center w-full"><div class="w-1/2 h-[2px] mx-[-2px] bg-gray-800"></div></div><div class="flex justify-center items-center w-full px-1 mt-[-1px]"><div class="w-[2px] h-4 bg-gray-800 rounded-full"></div><div class=w-1/2></div><div class="w-[2px] h-4 bg-gray-800 rounded-full"></div></div><div class="flex justify-center items-center w-full px-[10px] mt-[-2px]"><div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10"></div><div class=w-1/2></div><div class="w-2 h-2 border-2 border-gray-600 rounded-full z-10">');
const ot = ({
  variant: e = "1-to-2"
}) => e === "1-to-1" ? Pe() : (() => {
  var n = je();
  return X(() => I(n, R("flex flex-col items-center my-2", e === "2-to-1" && "flex-col-reverse"))), n;
})();
var Ne = /* @__PURE__ */ T('<div class="flex flex-col justify-start flex-grow w-full gap-2"><div class="flex flex-col justify-start w-full gap-2"></div><div class="flex justify-center w-full flex-grow">');
const st = ({
  children: e
}) => (() => {
  var n = Ne(), t = n.firstChild;
  return y(t, e), n;
})();
var Xe = /* @__PURE__ */ T('<div class="flex justify-evenly w-full gap-2">');
const it = ({
  children: e
}) => (() => {
  var n = Xe();
  return y(n, e), n;
})();
var Ve = /* @__PURE__ */ T('<div><div class="flex items-center gap-2 w-full"><span class=flex-grow>'), Ye = /* @__PURE__ */ T('<div class="text-red-500 text-xs mt-2 py-1 px-2 w-full border border-red-500/20 rounded-full flex flex-start gap-2 items-center overflow-hidden"><span class=truncate>'), ze = /* @__PURE__ */ T("<div>"), Be = /* @__PURE__ */ T('<span class="text-white/50 text-xs border border-white/10 px-3 py-1 rounded-full flex items-center gap-1 font-mono">'), Fe = /* @__PURE__ */ T('<span class="text-white/50 text-xs border border-white/10 px-3 py-1 rounded-full flex items-center gap-1 font-mono"> ');
const Ke = ({
  icon: e,
  title: n,
  status: t,
  variant: a = "ghost",
  fps: l,
  customStat: c,
  error: d,
  children: o
}) => (() => {
  var s = Ve(), i = s.firstChild, h = i.firstChild;
  return y(i, D(e, {
    size: 14
  }), h), y(h, n), y(i, (() => {
    var u = F(() => t() === "success");
    return () => u() && D(he, {
      size: 14,
      class: "text-green-500"
    });
  })(), null), y(i, (() => {
    var u = F(() => t() === "error");
    return () => u() && D(ve, {
      size: 14,
      class: "text-red-500"
    });
  })(), null), y(i, (() => {
    var u = F(() => t() === "loading");
    return () => u() && D(ie, {
      size: 16,
      class: "text-gray-500 animate-spin"
    });
  })(), null), y(i, (() => {
    var u = F(() => t() === "active");
    return () => u() && D(pe, {
      size: 14,
      class: "text-blue-500 animate-spin"
    });
  })(), null), y(i, (() => {
    var u = F(() => t() === "neutral");
    return () => u() && D(me, {
      size: 14,
      class: "text-gray-500"
    });
  })(), null), y(s, o, null), y(s, (() => {
    var u = F(() => t() === "error" && d?.() != "");
    return () => u() && (() => {
      var v = Ye(), S = v.firstChild;
      return y(v, D(ge, {
        size: 14,
        class: "text-red-500 flex-shrink-0"
      }), S), y(S, () => d?.() ?? ""), v;
    })();
  })(), null), y(s, (l || c) && (() => {
    var u = ze();
    return y(u, c && (() => {
      var v = Be();
      return y(v, c), v;
    })(), null), y(u, l && (() => {
      var v = Fe(), S = v.firstChild;
      return y(v, () => l().toFixed(0), S), y(v, D(ye, {
        size: 12
      }), null), v;
    })(), null), X(() => I(u, R("flex items-center gap-2 justify-center overflow-hidden transition-all duration-300", t() === "loading" ? "h-0 mt-0" : "h-7 mt-2"))), u;
  })(), null), X((u) => {
    var v = R("flex flex-col items-center text-gray-400 text-xs p-2 flex-grow cursor-default", a === "card" && "bg-gray-800 rounded-md", a === "ghost" && "border-gray-800 border rounded-md"), S = d?.() ?? "";
    return v !== u.e && I(s, u.e = v), S !== u.t && Ee(s, "title", u.t = S), u;
  }, {
    e: void 0,
    t: void 0
  }), s;
})();
var Re = /* @__PURE__ */ T('<div class="h-screen w-screen grid grid-cols-8 md:grid-rows-[auto_1fr] grid-rows-[auto_1fr] bg-[#030712] p-2 gap-2"><div><div class="flex items-center justify-between text-white text-sm text-left py-3 px-4 border-b border-[#292B34]"><h1></h1><div class="flex gap-1"><button class="border border-[#292B34] rounded-md px-2 py-1 hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed md:hidden"></button></div></div><div></div></div><div class="md:col-span-6 col-span-8 min-h-0 overflow-hidden h-full"><div class="border-[#292B34] border h-full w-full rounded-md overflow-hidden">');
const lt = ({
  title: e,
  action: n,
  sidebar: t,
  children: a
}) => {
  const [l, c] = A(!1);
  return (() => {
    var d = Re(), o = d.firstChild, s = o.firstChild, i = s.firstChild, h = i.nextSibling, u = h.firstChild, v = s.nextSibling, S = o.nextSibling, M = S.firstChild;
    return y(i, e), y(h, n, u), u.$$click = () => c(!l()), y(u, (() => {
      var b = F(() => !!l());
      return () => b() ? D(be, {
        size: 14
      }) : D(we, {
        size: 14
      });
    })()), y(v, t), y(M, a), X((b) => {
      var C = R("bg-[#10141E] border-[#292B34] border md:col-span-2 col-span-8 rounded-xl min-h-0 overflow-hidden", l() ? "h-auto" : "h-14 md:!h-auto"), j = R("transition-all duration-300", l() ? "overflow-y-auto h-[calc(100vh-3rem)] p-2" : "h-0 p-0 overflow-hidden md:!overflow-y-auto md:!h-[calc(100vh-3rem)] md:!p-2");
      return C !== b.e && I(o, b.e = C), j !== b.t && I(v, b.t = j), b;
    }, {
      e: void 0,
      t: void 0
    }), d;
  })();
};
J(["click"]);
var Ie = /* @__PURE__ */ T('<div class="flex flex-col gap-4 items-center justify-center py-6"><div class="flex gap-2 bg-black/10 rounded-full p-4"></div><div class="flex gap-2"><button>Start Rotation</button><button class="bg-transparent hover:text-red-600 text-red-500 p-2 rounded-full disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2">'), Oe = /* @__PURE__ */ T("<div>");
const rt = ({
  camera: e
}) => {
  const [n, t] = A("neutral"), [a, l] = A(!1), [c, d] = A(0);
  let o = null, s = null;
  const i = 10, h = 1e3, u = Math.PI * 2 / i, v = (b) => {
    if (!a() || b >= i) {
      l(!1), t("neutral"), d(0);
      return;
    }
    s || (s = e()), s && (s.rotateAroundPivotPoint(u, 0), d(b + 1), o = window.setTimeout(() => v(b + 1), h));
  }, S = () => {
    a() || (s = e(), s && (l(!0), t("active"), d(0), v(0)));
  }, M = () => {
    o && (clearTimeout(o), o = null), l(!1), t("neutral"), d(0), s = null;
  };
  return se(() => {
    o && clearTimeout(o);
  }), D(Ke, {
    variant: "card",
    icon: xe,
    title: "Dolly Cam Test",
    status: n,
    get children() {
      var b = Ie(), C = b.firstChild, j = C.nextSibling, k = j.firstChild, V = k.firstChild, N = k.nextSibling;
      return y(C, () => Array.from({
        length: i
      }).map((L, p) => (() => {
        var m = Oe();
        return X(() => I(m, R(
          "w-3 h-3 rounded-full border",
          p < c() ? "bg-blue-200 border-blue-200" : "bg-transparent border-gray-400"
          // Empty dot for pending steps
        ))), m;
      })())), k.$$click = S, y(k, D($e, {
        size: 16
      }), V), N.$$click = M, y(N, D(Ae, {
        size: 14
      })), X((L) => {
        var p = a(), m = R("text-white px-4 py-2 rounded-md disabled:bg-black/10 disabled:cursor-not-allowed flex items-center gap-2", a() ? "bg-black/10" : "bg-blue-600 hover:bg-blue-700"), g = !a();
        return p !== L.e && (k.disabled = L.e = p), m !== L.t && I(k, L.t = m), g !== L.a && (N.disabled = L.a = g), L;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), b;
    }
  });
};
J(["click"]);
export {
  rt as DollyCamCard,
  Te as DownloadMetricsButton,
  ot as FunnelConnector,
  lt as Layout,
  st as Pipeline,
  nt as RecordButton,
  it as Splitter,
  Ke as StatusRow,
  R as cn,
  Ze as createCamera,
  _e as createStalker,
  Ce as generateSessionName,
  Qe as getAppName,
  Je as setAppName,
  tt as useArcballControls,
  et as useFps
};
