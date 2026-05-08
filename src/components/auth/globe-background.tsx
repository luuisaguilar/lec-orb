"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function GlobeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ─── BACKGROUND PARTICLES (STARFIELD) ───
    const starCount = 6000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Spherical distribution
      const r = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = r * Math.cos(phi);

      // Color variation (blues and whites)
      const mix = Math.random();
      starColors[i3] = 0.5 + mix * 0.5;     // R
      starColors[i3 + 1] = 0.7 + mix * 0.3; // G
      starColors[i3 + 2] = 1.0;             // B
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // ─── THE GLOBE ───
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Inner Sphere (The "Solid" Body)
    const globeGeometry = new THREE.SphereGeometry(3, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a192f,
      emissive: 0x001233,
      specular: 0x3b82f6,
      shininess: 40,
      transparent: true,
      opacity: 0.9,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globeMesh);

    // 2. Wireframe Overlay (The "Digital" Grid)
    const gridGeometry = new THREE.SphereGeometry(3.02, 40, 40);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    globeGroup.add(gridMesh);

    // 3. Points Cloud (The "Data" Layer)
    const pointsGeometry = new THREE.SphereGeometry(3.05, 64, 64);
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    globeGroup.add(pointsMesh);

    // 4. Fresnel / Atmosphere Glow
    const atmosphereGeometry = new THREE.SphereGeometry(3.4, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphere);

    // ─── ORBITAL RINGS ───
    const createRing = (radius: number, color: number, rotation: number) => {
        const ringGeo = new THREE.RingGeometry(radius, radius + 0.02, 128);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + rotation;
        ring.rotation.y = rotation;
        return ring;
    };

    const ring1 = createRing(4.5, 0x3b82f6, 0.2);
    const ring2 = createRing(5.2, 0x1d4ed8, -0.4);
    scene.add(ring1);
    scene.add(ring2);

    // ─── LIGHTING ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x3b82f6, 2, 20);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x1d4ed8, 1, 15);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);

    // ─── FLOATING DATA PARTICLES (DIGITAL DUST) ───
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePos[i3] = (Math.random() - 0.5) * 20;
        particlePos[i3 + 1] = (Math.random() - 0.5) * 20;
        particlePos[i3 + 2] = (Math.random() - 0.5) * 20;
        
        particleVel[i3] = (Math.random() - 0.5) * 0.01;
        particleVel[i3 + 1] = (Math.random() - 0.5) * 0.01;
        particleVel[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.08,
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    camera.position.z = 12;

    // ─── ANIMATION ───
    let frameId: number;
    const timer = new THREE.Timer();
    if (typeof document !== "undefined") {
        timer.connect(document);
    }

    const animate = () => {
      timer.update();
      const elapsedTime = timer.getElapsed();
      frameId = requestAnimationFrame(animate);

      // Rotate Globe
      globeGroup.rotation.y += 0.002;
      globeGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;

      // Rotate Starfield
      starField.rotation.y -= 0.0005;
      starField.rotation.x += 0.0002;

      // Rotate Rings
      ring1.rotation.z += 0.001;
      ring2.rotation.z -= 0.0015;

      // Twinkle stars
      starMaterial.opacity = 0.6 + Math.sin(elapsedTime * 0.5) * 0.2;

      // Animate Particles
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += particleVel[i3];
          positions[i3+1] += particleVel[i3+1];
          positions[i3+2] += particleVel[i3+2];

          // Wrap around
          if (Math.abs(positions[i3]) > 10) positions[i3] *= -0.9;
          if (Math.abs(positions[i3+1]) > 10) positions[i3+1] *= -0.9;
          if (Math.abs(positions[i3+2]) > 10) positions[i3+2] *= -0.9;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{ 
        background: "radial-gradient(circle at center, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 1) 100%)" 
      }}
    />
  );
}
