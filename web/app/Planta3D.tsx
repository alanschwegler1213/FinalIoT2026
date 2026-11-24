"use client";
/* eslint-disable react-hooks/immutability -- three.js se anima mutando objetos dentro de useFrame, fuera del render */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Albahaca procedural: las hojas se caen y amarillean a medida que baja la humedad.
type Arrastre = { activo: boolean; x: number; dx: number; vel: number };

const VERDE = new THREE.Color("#48ad55");
const MUSTIA = new THREE.Color("#a8a347");
const SUELO_Y = 0.52;

/** 1 = planta feliz, 0 = muy seca. */
const salud = (pct: number) => THREE.MathUtils.clamp((pct - 12) / 35, 0, 1);

function hojaGeometria() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.36, 0.14, 0.42, 0.72, 0, 1.12);
  s.bezierCurveTo(-0.42, 0.72, -0.36, 0.14, 0, 0);
  const g = new THREE.ShapeGeometry(s, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // Hoja ahuecada (bordes hacia arriba) y curvada a lo largo.
    p.setZ(i, x * x * 1.1 - 0.12 * y * y);
  }
  g.computeVertexNormals();
  return g;
}

function puntoBrillo() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(220,255,190,0.8)");
  g.addColorStop(1, "rgba(220,255,190,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const TALLOS = [
  { x: 0, z: 0, alto: 1.95, ix: 0, iz: 0, gira: 0 },
  { x: 0.36, z: 0.14, alto: 1.5, ix: 0.1, iz: -0.22, gira: 0.7 },
  { x: -0.32, z: 0.24, alto: 1.6, ix: 0.16, iz: 0.2, gira: 1.9 },
  { x: 0.06, z: -0.4, alto: 1.35, ix: -0.24, iz: 0.04, gira: 2.6 },
  { x: -0.38, z: -0.2, alto: 1.2, ix: -0.14, iz: 0.26, gira: 3.4 },
  { x: 0.4, z: -0.22, alto: 1.1, ix: -0.12, iz: -0.26, gira: 4.4 },
];
const NUDOS = [
  { f: 0.3, tam: 0.82 },
  { f: 0.52, tam: 0.76 },
  { f: 0.72, tam: 0.62 },
  { f: 0.88, tam: 0.46 },
  { f: 1.0, tam: 0.3 },
];

function Escena({ pct, quieto, arrastre }: { pct: number; quieto: boolean; arrastre: React.RefObject<Arrastre> }) {
  const camara = useThree((s) => s.camera);
  useEffect(() => {
    camara.lookAt(0, 1.15, 0);
  }, [camara]);

  const hoja = useMemo(() => hojaGeometria(), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: VERDE.clone(),
        side: THREE.DoubleSide,
        roughness: 0.45,
        emissive: new THREE.Color("#0f3a18"), // evita que el envés quede negro
      }),
    [],
  );
  const textura = useMemo(() => puntoBrillo(), []);
  const luciernagas = useMemo(() => {
    const n = 46;
    const pos = new Float32Array(n * 3);
    // Secuencias de baja discrepancia: reparto parejo y estable entre renders.
    const fr = (x: number) => x - Math.floor(x);
    for (let i = 0; i < n; i++) {
      const a = fr(i * 0.618034) * Math.PI * 2;
      const r = 1.1 + fr(i * 0.754878) * 1.6;
      pos.set([Math.cos(a) * r, 0.4 + fr(i * 0.569840) * 2.6, Math.sin(a) * r], i * 3);
    }
    return new THREE.BufferAttribute(pos, 3);
  }, []);

  const planta = useRef<THREE.Group>(null);
  const brillos = useRef<THREE.Points>(null);
  const pivotes = useRef(new Map<THREE.Group, number>());
  const actual = useRef(salud(pct));
  const giro = useRef(0.4);

  useFrame((estado, dt) => {
    const t = estado.clock.elapsedTime;
    actual.current = THREE.MathUtils.damp(actual.current, salud(pct), 1.5, dt);
    const s = actual.current;
    material.color.copy(MUSTIA).lerp(VERDE, s);
    for (const [g, base] of pivotes.current) {
      // Feliz: hojas hacia arriba (~25°). Seca: colgando (~-55°).
      const elev = THREE.MathUtils.lerp(-0.95, 0.42, s) + base;
      g.rotation.x = Math.PI / 2 - elev + (quieto ? 0 : Math.sin(t * 1.3 + base * 20) * 0.04);
    }
    const a = arrastre.current;
    if (a.activo) {
      giro.current += a.dx * 0.01;
      a.vel = a.dx * 0.01;
      a.dx = 0;
    } else {
      giro.current += a.vel + (quieto ? 0 : dt * 0.18);
      a.vel *= 0.94;
    }
    if (planta.current) {
      planta.current.rotation.y = giro.current;
      planta.current.rotation.z = quieto ? 0 : Math.sin(t * 0.7) * 0.025;
    }
    if (brillos.current && !quieto) {
      brillos.current.rotation.y = t * 0.06;
      brillos.current.position.y = Math.sin(t * 0.5) * 0.12;
    }
  });

  // Cada pivote de hoja se registra al montarse; useFrame los inclina según la salud.
  const registrar = (base: number) => (g: THREE.Group | null) => {
    if (g) pivotes.current.set(g, base);
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#d8f0dc", "#3a5a40", 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={2.1} color="#fff3dc" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#9fe0b8" />

      <group ref={planta} position={[0, -0.25, 0]}>
        {/* Maceta de terracota con plato */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.98, 0.9, 0.1, 48]} />
          <meshStandardMaterial color="#9c4f2e" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.04 + 0.32, 0]}>
          <cylinderGeometry args={[0.88, 0.66, 0.62, 48]} />
          <meshStandardMaterial color="#c0673f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.98, 0.94, 0.2, 48]} />
          <meshStandardMaterial color="#cc7348" roughness={0.8} />
        </mesh>
        <mesh position={[0, SUELO_Y + 0.1, 0]}>
          <cylinderGeometry args={[0.88, 0.88, 0.02, 48]} />
          <meshStandardMaterial color="#3a2a1d" roughness={1} />
        </mesh>

        {TALLOS.map((tallo, i) => (
          <group key={i} position={[tallo.x, SUELO_Y + 0.07, tallo.z]} rotation={[tallo.ix, tallo.gira, tallo.iz]}>
            <mesh position={[0, tallo.alto / 2, 0]}>
              <cylinderGeometry args={[0.03, 0.045, tallo.alto, 8]} />
              <meshStandardMaterial color="#4f8a3c" roughness={0.7} />
            </mesh>
            {NUDOS.map((n, j) =>
              [0, Math.PI].map((lado) => (
                // Pares opuestos, cada par girado 90° respecto del anterior.
                <group key={`${j}-${lado}`} position={[0, tallo.alto * n.f, 0]} rotation={[0, lado + (j % 2) * (Math.PI / 2), 0]}>
                  <group ref={registrar(j * 0.12)} rotation={[Math.PI / 2 - 0.42 - j * 0.12, 0, 0]}>
                    <mesh geometry={hoja} material={material} scale={n.tam} />
                  </group>
                </group>
              )),
            )}
          </group>
        ))}
      </group>

      <points ref={brillos}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={luciernagas} />
        </bufferGeometry>
        <pointsMaterial
          map={textura}
          size={0.16}
          color="#cfff9e"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.85}
        />
      </points>
    </>
  );
}

export default function Planta3D({ pct }: { pct: number }) {
  const arrastre = useRef<Arrastre>({ activo: false, x: 0, dx: 0, vel: 0 });
  const quieto = useMemo(
    () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <div
      style={{ position: "absolute", inset: 0 }}
      role="img"
      aria-label={`Albahaca en 3D: ${pct >= 45 ? "hojas firmes" : pct >= 30 ? "hojas algo caídas" : "hojas mustias"}, humedad ${pct} %`}
      onPointerDown={(e) => {
        arrastre.current = { activo: true, x: e.clientX, dx: 0, vel: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const a = arrastre.current;
        if (!a.activo) return;
        a.dx += e.clientX - a.x;
        a.x = e.clientX;
      }}
      onPointerUp={() => (arrastre.current.activo = false)}
      onPointerCancel={() => (arrastre.current.activo = false)}
    >
      <Canvas dpr={[1, 2]} camera={{ position: [0, 2.3, 6.3], fov: 34 }} gl={{ alpha: true, antialias: true }}>
        <Escena pct={pct} quieto={quieto} arrastre={arrastre} />
      </Canvas>
    </div>
  );
}
