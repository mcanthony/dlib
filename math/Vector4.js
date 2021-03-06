import Vec4 from "../node_modules/gl-matrix/src/gl-matrix/Vec4.js";

export default class Vector4 {
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.components = Vec4.create();
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  get x() {
    return this.components[0];
  }

  set x(value) {
    this.components[0] = value;
  }

  get y() {
    return this.components[1];
  }

  set y(value) {
    this.components[1] = value;
  }

  get z() {
    return this.components[2];
  }

  set z(value) {
    this.components[2] = value;
  }

  get w() {
    return this.components[3];
  }

  set w(value) {
    this.components[3] = value;
  }
}
