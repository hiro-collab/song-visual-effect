import type * as ThreeModule from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type SongAppThreeServices = {
  THREE: typeof ThreeModule;
  GLTFLoader: new () => GLTFLoader;
};

