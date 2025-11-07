
import * as THREE from "three";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AudioAnalysisState } from "@/lib/audioAnalysis";


export const Background1 = () => {

  return (
    <div className="fixed w-[100vw] h-[100vh] -z-10">
      <Canvas camera={{ position: [0, 0, 30], fov: 75 }} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}

const Scene = () => {
  const group = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta / 10;
      group.current.rotation.x += delta / 15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.05} />
      <group ref={group}>
        <Swarm count={2000} />
      </group>
    </>
  )
}

function Swarm({ count, dummy = new THREE.Object3D() }: { count: number; dummy?: THREE.Object3D }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -5 + Math.random() * 10;
      const yFactor = -5 + Math.random() * 10;
      const zFactor = -5 + Math.random() * 10;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    light.current.position.set(
      (-state.mouse.x * state.viewport.width) / 5,
      (-state.mouse.y * state.viewport.height) / 5,
      0
    );
    particles.forEach((particle, i) => {
      // eslint-disable-next-line prefer-const
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 20;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      dummy.position.set(
        (particle.mx / 10) * a +
          xFactor +
          Math.cos((t / 10) * factor) +
          (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b +
          yFactor +
          Math.sin((t / 10) * factor) +
          (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b +
          zFactor +
          Math.cos((t / 10) * factor) +
          (Math.sin(t * 3) * factor) / 10
      );

      const N = AudioAnalysisState.dataArray ? AudioAnalysisState.dataArray.length / 2 : 1;
      const dataIdx = Math.floor(((a + b + s) * 400.0) % N);

      dummy.position.multiplyScalar(0.7 + 0.4 * (AudioAnalysisState.dataArray ? AudioAnalysisState.dataArray[dataIdx] / 255 : 0));
      dummy.scale.setScalar(0.1);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight ref={light} distance={100} intensity={20} color="lightblue">
      </pointLight>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={1.0} />
      </instancedMesh>
    </>
  );
}

