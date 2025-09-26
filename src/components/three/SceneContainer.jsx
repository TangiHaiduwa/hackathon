// src/components/three/SceneContainer.jsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import ModelViewer from './ModelViewer';

const SceneContainer = ({ modelPath, className = "h-64", ...props }) => {
  return (
    <div className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200 ${className}`}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <ModelViewer modelPath={modelPath} {...props} />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
        🔍 Drag to rotate • Scroll to zoom
      </div>
      <Loader />
    </div>
  );
};

export default SceneContainer;