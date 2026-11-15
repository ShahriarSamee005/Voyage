"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Interactive 3D rover (Rover Hub → 3D Model). three.js is loaded only when this panel opens.
 * The model turns slowly on its own; drag to rotate, scroll / pinch to zoom, right-drag to pan.
 * Auto-spin pauses while the player handles it and resumes a few seconds after they let go.
 */
export function RoverModel3D({ src, label }: { src: string; label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;

      const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
      scene.add(new THREE.HemisphereLight(0xffe2c8, 0x40221a, 0.9));
      const sun = new THREE.DirectionalLight(0xfff1df, 2.4);
      sun.position.set(3, 5, 2.5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0004;
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0x68d7e9, 0.9);
      rim.position.set(-4, 2.5, -3);
      scene.add(rim);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.1;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.maxPolarAngle = Math.PI * 0.53; // never far below the ground

      // Pause the spin while the player handles the model; resume after they let go.
      let resumeTimer = 0;
      const onStart = () => {
        controls.autoRotate = false;
        window.clearTimeout(resumeTimer);
        setHint(false);
      };
      const onEnd = () => {
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(() => (controls.autoRotate = true), 3500);
      };
      controls.addEventListener("start", onStart);
      controls.addEventListener("end", onEnd);

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      new GLTFLoader().load(
        src,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          model.traverse((o) => {
            const mesh = o as import("three").Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          // Centre on the origin, wheels on the ground.
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          model.position.set(-center.x, -box.min.y, -center.z);
          scene.add(model);

          const radius = Math.max(size.x, size.y, size.z);
          const ground = new THREE.Mesh(
            new THREE.CircleGeometry(radius * 1.15, 64),
            new THREE.ShadowMaterial({ opacity: 0.35 }),
          );
          ground.rotation.x = -Math.PI / 2;
          ground.receiveShadow = true;
          scene.add(ground);
          sun.shadow.camera.left = sun.shadow.camera.bottom = -radius;
          sun.shadow.camera.right = sun.shadow.camera.top = radius;
          sun.shadow.camera.updateProjectionMatrix();

          const target = new THREE.Vector3(0, size.y * 0.42, 0);
          const home = new THREE.Vector3(radius * 1.22, radius * 0.6, radius * 1.45);
          controls.target.copy(target);
          camera.position.copy(home);
          controls.minDistance = radius * 0.45;
          controls.maxDistance = radius * 4;
          controls.update();
          resetRef.current = () => {
            controls.target.copy(target);
            camera.position.copy(home);
            controls.autoRotate = true;
            controls.update();
          };
          setStatus("ready");
        },
        (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
        () => !disposed && setStatus("error"),
      );

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(resumeTimer);
        ro.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          const mesh = o as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            for (const v of Object.values(m)) if (v && (v as import("three").Texture).isTexture) (v as import("three").Texture).dispose();
            m.dispose();
          }
        });
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => !disposed && setStatus("error"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label={`3D model of ${label}. Drag to rotate, scroll to zoom.`} role="img" />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="font-mono text-[12px] tracking-[0.3em] text-ui-cyan/80">LOADING 3D MODEL</span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-ui-cyan/15">
            <div className="h-full bg-ui-cyan transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-[15px] text-ui-muted">The 3D model couldn&apos;t load. Check your connection and reopen this section.</div>
      )}
      {status === "ready" && (
        <>
          <div
            className={`pointer-events-none absolute bottom-3 left-3 whitespace-nowrap rounded-full border border-ui-cyan/40 bg-black/60 px-3 py-1 font-mono text-[10.5px] tracking-wider text-ui-text/85 transition-opacity duration-700 ${hint ? "opacity-100" : "opacity-0"}`}
          >
            DRAG TO ROTATE · SCROLL TO ZOOM · RIGHT-DRAG TO PAN
          </div>
          <button
            type="button"
            onClick={() => resetRef.current()}
            className="absolute right-3 top-3 rounded border border-ui-cyan/60 bg-black/60 px-3 py-1.5 font-mono text-[11px] tracking-widest text-ui-cyan transition hover:bg-ui-cyan/20 focus-visible:outline-2 focus-visible:outline-ui-cyan"
          >
            RESET VIEW
          </button>
        </>
      )}
    </div>
  );
}
