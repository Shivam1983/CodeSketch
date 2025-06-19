// app/components/MonacoConfigLoader.tsx
'use client';

import { useEffect } from 'react';
import { monacoConfig } from '@/config/monaco.config';  // adjust path as needed

export default function MonacoConfigLoader() {
  useEffect(() => {
    monacoConfig();
  }, []);

  return null;
}