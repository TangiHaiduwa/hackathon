// src/components/three/ModelViewer.jsx
import React, { useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const ModelViewer = ({ modelPath, position = [0, 0, 0], scale = 1, autoRotate = true }) => {
  const group = useRef();
  const { scene } = useGLTF(modelPath);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-rotation animation
  useFrame((state, delta) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.2;
    }
    if (isHovered && group.current) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      <OrbitControls enableZoom={true} enablePan={false} />
      <group 
        ref={group} 
        position={position} 
        scale={scale}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <primitive object={scene} />
      </group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
    </>
  );
};

export default ModelViewer;