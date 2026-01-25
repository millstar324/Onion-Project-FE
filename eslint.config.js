import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'args',
            'position',
            'intensity',
            'roughness',
            'emissive',
            'emissiveIntensity',
            'color',
            'makeDefault',
            'shadows',
            'object',
            'rotation',
            'scale',
            'geometry',
            'castShadow',
            'receiveShadow',
            'map',
            'normalMap',
            'displacementMap',
            'displacementScale',
            'side',
            'transparent',
            'penumbra', 
            'angle', 
            'intensity', 
            'position', 
            'castShadow', 
            'receiveShadow',
            'args', 
            'rotation', 
            'scale',
            'fov',
            "material",
          ],
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
