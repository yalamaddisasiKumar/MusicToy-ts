import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/main.ts',
  output: {
    dir: 'bin',
    format: "umd",
    name: "musicToy"
  },
  plugins: [typescript()]
};