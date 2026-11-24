const fs = require('node:fs');
const path = require('node:path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');

function configureWindowsCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const marker = 'buildStagingDirectory "C:/c"';
    if (!modConfig.modResults.contents.includes(marker)) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /android \{\r?\n/,
        (match) => `${match}    // Keep CMake output short enough for Windows path limits.\n    externalNativeBuild {\n        cmake {\n            if (System.getProperty("os.name").toLowerCase().contains("windows")) {\n                ${marker}\n            }\n        }\n    }\n\n`,
      );
    }
    return modConfig;
  });
}

function appendTargetRuntimeLink(projectRoot, relativeFile, target) {
  const file = path.join(projectRoot, relativeFile);
  const marker = `target_link_libraries(${target} c++_shared)`;
  if (!fs.existsSync(file)) {
    throw new Error(`No se encontró el archivo nativo requerido: ${relativeFile}`);
  }

  const contents = fs.readFileSync(file, 'utf8');
  if (!contents.includes(marker)) {
    fs.writeFileSync(
      file,
      `${contents.trimEnd()}\n\n# NDK 27 requires an explicit C++ runtime link.\n${marker}\n`,
    );
  }
}

function linkExpoModulesCoreRuntime(projectRoot) {
  const relativeFile = 'node_modules/expo-modules-core/android/CMakeLists.txt';
  const file = path.join(projectRoot, relativeFile);
  const marker = 'link_libraries(c++_shared)';
  if (!fs.existsSync(file)) {
    throw new Error(`No se encontró el archivo nativo requerido: ${relativeFile}`);
  }

  const contents = fs.readFileSync(file, 'utf8');
  if (!contents.includes(marker)) {
    const updated = contents.replace(
      /project\(expo-modules-core\)\r?\n/,
      (match) => `${match}\n# NDK 27 requires an explicit C++ runtime link.\n${marker}\n`,
    );
    fs.writeFileSync(file, updated);
  }
}

/**
 * AWS Face Liveness 1.10 brings LiteRT support modules that currently share
 * an Android namespace. Android Gradle Plugin 9 validates this strictly.
 * This vendor-documented compatibility setting is reapplied by Expo each time
 * it generates the Android project.
 */
module.exports = function withAndroidLivenessWorkaround(config) {
  config = configureWindowsCmakeObjectPaths(config);

  config = withGradleProperties(config, (modConfig) => {
    const existing = modConfig.modResults.find(
      (item) => item.type === 'property' && item.key === 'android.uniquePackageNames',
    );

    if (existing) {
      existing.value = 'false';
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'android.uniquePackageNames',
        value: 'false',
      });
    }

    return modConfig;
  });

  return withDangerousMod(config, ['android', async (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-worklets/android/CMakeLists.txt',
      'worklets',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-screens/android/CMakeLists.txt',
      'rnscreens',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-reanimated/android/CMakeLists.txt',
      'reanimated',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
      '${PACKAGE_NAME}',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-gesture-handler/android/CMakeLists.txt',
      'react_codegen_rngesturehandler_codegen',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-reanimated/Common/NativeView/CMakeLists.txt',
      'react_codegen_rnreanimated',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
      '${LIB_TARGET_NAME}',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-screens/android/src/main/jni/CMakeLists.txt',
      '${LIB_TARGET_NAME}',
    );
    appendTargetRuntimeLink(
      projectRoot,
      'node_modules/react-native-worklets/android/build/generated/source/codegen/jni/CMakeLists.txt',
      'react_codegen_rnworklets',
    );
    linkExpoModulesCoreRuntime(projectRoot);
    return modConfig;
  }]);
};
