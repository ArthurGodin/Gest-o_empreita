"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  pass,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";

const COLOR_MAP = "/hero/prumo-topography.png";
const DEPTH_MAP = "/hero/prumo-topography-depth.webp";
const SOURCE_SIZE = 640;

interface PrumoTopographyCanvasProps {
  active: boolean;
}

export function PrumoTopographyCanvas({
  active,
}: PrumoTopographyCanvasProps) {
  return (
    <Canvas
      aria-hidden="true"
      data-prumo-hero-canvas="true"
      dpr={[1, 1.25]}
      flat
      frameloop={active ? "always" : "demand"}
      gl={async (properties) => {
        const rendererOptions = {
          canvas: properties.canvas as HTMLCanvasElement,
          alpha: true,
          antialias: true,
          forceWebGL: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        } as const;
        const renderer = new THREE.WebGPURenderer(rendererOptions);
        await renderer.init();
        renderer.setClearColor(0x070c0a, 0);
        return renderer;
      }}
      performance={{ min: 0.6 }}
    >
      <TopographyPostProcessing />
      <TopographyPlane />
    </Canvas>
  );
}

function TopographyPostProcessing() {
  const { gl, scene, camera } = useThree();
  const postProcessing = useMemo(() => {
    const processor = new THREE.PostProcessing(
      gl as unknown as THREE.WebGPURenderer,
    );
    const scenePass = pass(scene, camera);
    const sceneColor = scenePass.getTextureNode("output");
    const glow = bloom(sceneColor, 0.38, 0.28, 0.72);
    processor.outputNode = sceneColor.add(glow);
    return processor;
  }, [camera, gl, scene]);

  useEffect(() => () => postProcessing.dispose(), [postProcessing]);

  useFrame(() => {
    postProcessing.render();
  }, 1);

  return null;
}

function TopographyPlane() {
  const textures = useLoader(THREE.TextureLoader, [
    COLOR_MAP,
    DEPTH_MAP,
  ]);
  const sourceColorMap = textures[0]!;
  const depthMap = textures[1]!;
  const viewport = useThree((state) => state.viewport);
  const colorMap = useMemo(() => {
    const configuredMap = sourceColorMap.clone();
    configuredMap.colorSpace = THREE.SRGBColorSpace;
    configuredMap.needsUpdate = true;
    return configuredMap;
  }, [sourceColorMap]);

  useEffect(() => () => colorMap.dispose(), [colorMap]);

  const shader = useMemo(() => {
    const pointerNode = uniform(new THREE.Vector2(0, 0));
    const progressNode = uniform(0);
    const depthTexture = texture(depthMap);
    const displacedTexture = texture(
      colorMap,
      uv().add(depthTexture.r.mul(pointerNode).mul(0.018)),
    );

    const aspect = float(1);
    const mappedUv = vec2(uv().x.mul(aspect), uv().y);
    const tiling = vec2(108);
    const tiledUv = mod(mappedUv.mul(tiling), 2).sub(1);
    const brightness = mx_cell_noise_float(mappedUv.mul(tiling).div(2));
    const distance = float(tiledUv.length());
    const point = smoothstep(0.36, 0.345, distance).mul(brightness);
    const scanBand = oneMinus(
      smoothstep(0, 0.026, abs(depthTexture.r.sub(progressNode))),
    );
    const objectMask = smoothstep(
      0.03,
      0.18,
      displacedTexture.rgb.length(),
    );
    const emeraldScan = point
      .mul(scanBand)
      .mul(objectMask)
      .mul(vec3(0.04, 3.4, 1.7));
    const finalColor = blendScreen(displacedTexture, emeraldScan);

    return {
      material: new THREE.MeshBasicNodeMaterial({
        colorNode: finalColor,
        opacity: 0,
        transparent: true,
      }),
      pointer: pointerNode,
      progress: progressNode,
    };
  }, [colorMap, depthMap]);
  const animation = useRef(shader);
  const { material } = shader;

  useEffect(() => {
    animation.current = shader;
    return () => shader.material.dispose();
  }, [shader]);

  const sourceAspect = SOURCE_SIZE / SOURCE_SIZE;
  const coveredWidth = Math.max(viewport.width, viewport.height * sourceAspect);
  const coveredHeight = coveredWidth / sourceAspect;
  const scale = 0.72;
  const positionX = viewport.width * 0.12;
  const positionY = -viewport.height * 0.035;

  useFrame(({ clock, pointer: normalizedPointer }) => {
    const current = animation.current;
    current.progress.value =
      Math.sin(clock.getElapsedTime() * 0.58) * 0.5 + 0.5;
    current.pointer.value.lerp(normalizedPointer, 0.055);
    current.material.opacity = THREE.MathUtils.lerp(
      current.material.opacity,
      0.84,
      0.055,
    );
  });

  return (
    <mesh
      material={material}
      position={[positionX, positionY, 0]}
      scale={[coveredWidth * scale, coveredHeight * scale, 1]}
    >
      <planeGeometry />
    </mesh>
  );
}
