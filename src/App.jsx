import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas, extend, useThree, useFrame } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  quat,
  useRevoluteJoint,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { Cylinder, useGLTF } from "@react-three/drei";
import { useControls } from "leva";

extend({ MeshLineGeometry, MeshLineMaterial });

useGLTF.preload("/keyring.glb");

function App() {
  const { debug } = useControls({ debug: false });

  return (
    <Canvas camera={{ position: [0, 0, 13], fov: 25 }}>
      <Physics
        debug={debug}
        interpolate
        gravity={[0, -40, 0]}
        timeStep={1 / 60}
      >
        <Band />
      </Physics>
    </Canvas>
  );
}

const Band = () => {
  const { nodes } = useGLTF("/keyring.glb");

  // Referencias par ala banda y las juntas
  const band = useRef(),
    fixed = useRef(),
    j1 = useRef(),
    j2 = useRef(),
    j3 = useRef(),
    card = useRef(),
    anilla = useRef();
  const vec = new THREE.Vector3(), ang = new THREE.Vector3(), rot = new THREE.Vector3(), dir = new THREE.Vector3() // prettier-ignore

  // Tamaño del canvas
  const { width, height } = useThree((state) => state.size);

  // Curva Catmull Rom
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  const [rotating, setRotate] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);

  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 0, 0.55],
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => void (document.body.style.cursor = "auto");
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      // Calculate catmul curve
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.translation());
      curve.points[2].copy(j1.current.translation());
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(32));
      // Tilt it back towards the screen
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }

    if (rotating) {
      anilla.current.rotation.y += delta * Math.random() * 10;
    }
  });

  return (
    <>
      <group position={[0, 2, 0]}>
        <RigidBody
          ref={fixed}
          angularDamping={2}
          linearDamping={2}
          type="fixed"
        />
        <RigidBody
          angularDamping={2}
          linearDamping={2}
          position={[0.5, 0, 0]}
          ref={j1}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          angularDamping={2}
          linearDamping={2}
          position={[1, 0, 0]}
          ref={j2}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          angularDamping={2}
          linearDamping={2}
          position={[1.5, 0, 0]}
          ref={j3}
        >
          <BallCollider args={[0.05]} />
        </RigidBody>
        <group
          onPointerUp={(e) => (
            e.target.releasePointerCapture(e.pointerId),
            drag(false),
            setRotate(true),
            setTimeout(() => {
              setRotate(false);
            }, 500)
          )}
          onPointerDown={(e) => (
            e.target.setPointerCapture(e.pointerId),
            drag(
              new THREE.Vector3()
                .copy(e.point)
                .sub(vec.copy(card.current.translation()))
            )
          )}
        >
          <RigidBody
            angularDamping={2}
            linearDamping={2}
            ref={card}
            type={dragged ? "kinematicPosition" : "dynamic"}
            colliders={"trimesh"}
          >
            {/* <Cylinder
            args={[0.61, 0.61, 0.12]}
            visible={false}
            onPointerUp={(e) => (
              e.target.releasePointerCapture(e.pointerId),
              drag(false),
              setRotate(true),
              setTimeout(() => {
                setRotate(false);
              }, 500)
            )}
            onPointerDown={(e) => (
              e.target.setPointerCapture(e.pointerId),
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              )
            )}
          /> */}
            <mesh
              ref={anilla}
              geometry={nodes.Circle.geometry}
              scale={0.6}
              rotation={[0, Math.PI / 2, 0]}
              position={[0, -0.07, 0]}
            >
              <meshBasicMaterial
                transparent
                opacity={0.25}
                color="white"
                side={THREE.DoubleSide}
              />
            </mesh>
          </RigidBody>
          <RigidBody
            angularDamping={2}
            linearDamping={2}
            type={"dynamic"}
            colliders={"trimesh"}
            position={[0, 0, 2]}
          >
            <mesh
              geometry={nodes.Circle.geometry}
              scale={0.4}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0.5, 0, -2]}
            >
              <meshBasicMaterial
                transparent
                opacity={0.5}
                color="white"
                side={THREE.DoubleSide}
              />
            </mesh>
          </RigidBody>
        </group>
      </group>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          transparent
          opacity={0.25}
          color="white"
          depthTest={false}
          resolution={[width, height]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
};

export default App;
