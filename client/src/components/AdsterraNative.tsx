'use client';
import { useEffect, useRef } from 'react';

export default function AdsterraNative() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;
    if (adRef.current.querySelector('script')) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl31328477.profitableratecpmnetwork.com/b7a3446e75961b7dd97bfe1d36f31ffe/invoke.js';
    
    adRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full bg-slate-800 rounded-2xl p-2 border border-slate-700 flex justify-center items-center overflow-hidden my-4">
      <div ref={adRef} id="container-b7a3446e75961b7dd97bfe1d36f31ffe" className="w-full flex justify-center"></div>
    </div>
  );
}
