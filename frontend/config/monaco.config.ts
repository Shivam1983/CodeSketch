import { loader } from '@monaco-editor/react';

export const monacoConfig = () => {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
    }
  });
};