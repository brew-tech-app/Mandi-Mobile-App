module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@models': './src/models',
          '@database': './src/database',
          '@repositories': './src/repositories',
          '@services': './src/services',
          '@screens': './src/screens',
          '@components': './src/components',
          '@navigation': './src/navigation',
          '@utils': './src/utils',
          '@constants': './src/constants',
        },
      },
    ],
  ],
};
