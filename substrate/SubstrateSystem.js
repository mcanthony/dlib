import Particle from "../physics/Particle";
import Vector2 from "../math/Vector2";
import SubstratePolygon from "./SubstratePolygon";
import SubstrateEdge from "./SubstrateEdge";

export default class SubstrateSystem {
  constructor(width, height, {speed = 1, spawnProbabilityRatio = 0.1, spawnOptions = {}}) {

    this.edges = [];
    this.polygons = [];

    this.speed = speed;
    this.spawnProbabilityRatio = spawnProbabilityRatio;
    this.spawnOptions = spawnOptions;

    this.width = width;
    this.height = height;

    this.data = new Uint32Array(this.width * this.height);
  }

  clear() {
    for (var i = 0; i < this.data.length; i++) {
      this.data[i] = 0;
    }
    this.edges.length = 0;
    this.polygons.length = 0;
  }

  spawnEdge (x, y, velocityAngle, life) {
    let particle = new Particle(x, y, life);
    particle.velocity.setFromAngle(velocityAngle);
    let edge = new SubstrateEdge(new Vector2(x, y), particle);
    this.edges.push(edge);
    edge.id = this.edges.length;
    return edge;
  }

  addPolygon (vertices) {
    let polygon = new SubstratePolygon(vertices);
    polygon.id = this.polygons.length ? this.polygons[this.polygons.length - 1].id + 1 : 0;
    this.polygons.push(polygon);
    this.polygonAddedCallback(polygon);
    return polygon;
  }

  polygonAddedCallback (polygon) {}

  update () {
    for (let i = 0; i < this.speed; i++) {
      for (let edge of this.edges) {
        if (edge.boid.isDead) {
          continue;
        }

        edge.boid.update();

        if (edge.boid.position.x <= 0 || edge.boid.position.x >= this.width || edge.boid.position.y <= 0 || edge.boid.position.y >= this.height) {
          edge.boid.kill();
          continue;
        }

        let position = Math.floor(edge.boid.position.x) + this.width * Math.floor(edge.boid.position.y);

        let pixelId = this.data[position];

        if (pixelId && pixelId !== edge.id) {
          edge.boid.kill();
          this.splitEdgeWithEdge(this.getEdgeById(pixelId), edge);
        }
        else {
          // for (let i = -2; i < 3; i++) {
            // let position = Math.floor(edge.boid.position.x + edge.boid.velocity.y * i * .33) + this.width * Math.floor(edge.boid.position.y + -edge.boid.velocity.x * i * .33);
            // this.data[position] = edge.id;
          // }
          this.data[position] = edge.id;
        }

        // Add new edge
        if(Math.random() < this.spawnProbabilityRatio) {
          let velocityAngle;
          if(this.spawnOptions.velocityAngle === undefined) {
            velocityAngle = Math.pow(Math.random(), 100) * (Math.random() > 0.5 ? 1 : -1) + edge.boid.velocity.angle + Math.PI * 0.5 * (Math.random() > 0.5 ? 1 : -1);
          }
          else {
            velocityAngle = edge.boid.velocity.angle + this.spawnOptions.velocityAngle;
          }
          let spawnEdge = this.spawnEdge(edge.boid.position.x, edge.boid.position.y, velocityAngle, edge.boid.life);
          this.splitEdgeWithEdge(edge, spawnEdge, true);
        }
      }
    }
  }

  getEdgeById (id) {
    return this.edges[id - 1];
  }

  splitEdgeWithEdge (splittedEdge, edge) {
    let angle = splittedEdge.boid.velocity.angleTo(edge.boid.velocity);
    let isMainEdge = angle > 0;

    let sweepBoid = new Particle(edge.b.x, edge.b.y);
    sweepBoid.velocity.copy(splittedEdge.boid.velocity);
    sweepBoid.update();

    let newEdge = this.spawnEdge(sweepBoid.position.x, sweepBoid.position.y);
    newEdge.boid.copy(splittedEdge.boid);

    if (splittedEdge.boid.isDead) {
      newEdge.boid.kill();
    }
    else {
      splittedEdge.boid.kill();
    }

    splittedEdge.b.copy(edge.b);

    // Detect if spawned or collided
    let collided = edge.boid.isDead;

    if(collided) {
      isMainEdge = !isMainEdge;
    }

    if (splittedEdge.next !== splittedEdge.twin) {
      newEdge.next = splittedEdge.next;
      newEdge.next.twin.next.twin.next = newEdge.twin;
    }

    if (isMainEdge) {
      newEdge.twin.next = splittedEdge.twin;
      if (collided) {
        // console.log("main collided - " + edge.id + ' with ' + splittedEdge.id);
        edge.next = newEdge;
        splittedEdge.next = edge.twin;
      }
      else {
        // console.log("main spawned - " + edge.id + ' with ' + splittedEdge.id);
        edge.twin.next = newEdge;
        splittedEdge.next = edge;
      }
    }
    else {
      splittedEdge.next = newEdge;
      if (collided) {
        // console.log("twin collided - " + edge.id + ' with ' + splittedEdge.id);
        edge.next = splittedEdge.twin;
        newEdge.twin.next = edge.twin;
      }
      else {
        // console.log("twin spawned - " + edge.id + ' with ' + splittedEdge.id);
        newEdge.twin.next = edge;
        edge.twin.next = splittedEdge.twin;
      }
    }

    let sweepSecurityMargin = 0;
    while (sweepSecurityMargin < 3) {
      for (let i = -4; i < 5; i++) {
        let sweepPosition = Math.floor(sweepBoid.position.x + sweepBoid.velocity.y * i * .33) + this.width * Math.floor(sweepBoid.position.y - sweepBoid.velocity.x * i * .33);
        if(this.data[sweepPosition] === splittedEdge.id) {
          this.data[sweepPosition] = newEdge.id;
          sweepSecurityMargin = 0;
        }
      }
      sweepBoid.update();
      sweepSecurityMargin++;
    }

    if(collided) {
      this.polygonCheck(edge);
      this.polygonCheck(edge.twin);
    }
  }

  polygonCheck (startEdge) {
    let edge = startEdge;
    let vertices = [new Vector2(edge.a.x, edge.a.y)];
    for (let i = 0; i < 100; i++) {
      if (edge.next === edge.twin) {
        break;
      }
      if (Math.abs(edge.angle - edge.next.angle) > .1) {
        vertices.push(new Vector2(edge.b.x, edge.b.y));
      }
      edge = edge.next;
      if (edge.next === startEdge) {
        this.addPolygon(vertices);
        break;
      }
    }
  }
}
