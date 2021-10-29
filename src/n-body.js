const { vec3, mat4, vec4} = require("gl-matrix");
const demo = require("./demo");
const commands = require("./commands");

class Simulation {
  constructor(nMasses, history, dt) {
    this.dt = dt;
    this.nMasses = nMasses;
    this.history = history;
    this.masses = [];
    this.steps = 0;
    this.sigma = 10;
    this.beta = 8/3;
    this.rho = 28;
    for (let i = 0; i < this.nMasses; i++) {
      this.masses.push({
        force: [0, 0, 0],
        velocity: vec3.random([], 1),
        position: vec3.random([], 10),
        mass: Math.random() * 0.5 + 1.5,
        cpos: vec3.create([]),
        arrays: {
          position: new Float32Array(this.history * 3),
          color: new Float32Array(this.history * 3)
        },
        color: vec3.normalize([], [Math.random(), Math.random(), Math.random()])
      });
    }
  }

  step() {
    for (let j = 0; j < this.nMasses; j++) {
      const mj = this.masses[j];
      // this is where we do dynamics!
      vec3.set(mj.cpos,
        this.sigma * (mj.position[1] - mj.position[0]),
        mj.position[0] * (this.rho - mj.position[2]) - mj.position[1],
        mj.position[0] * mj.position[1] - this.beta * mj.position[2])
      vec3.scale(mj.cpos, mj.cpos, 0.2)
    }
    for (const mass of this.masses) {
      vec3.scaleAndAdd(
        mass.velocity,
        mass.velocity,
        mass.cpos,
        this.dt
      );
      //if (vec3.length(mass.velocity) > 1.0) {
      //  vec3.normalize(mass.velocity, mass.velocity);
      //}
      vec3.scaleAndAdd(mass.position, mass.position, mass.cpos, this.dt);
      mass.arrays.position.copyWithin(3, 0);
      mass.arrays.position[0] = mass.position[0];
      mass.arrays.position[1] = mass.position[1];
      mass.arrays.position[2] = mass.position[2];
      
      mass.arrays.color.copyWithin(3, 0);
      const positionMag = Math.max(0.125, vec3.length(mass.position) - 0.5);
      mass.arrays.color[0] =
        mass.color[0] * Math.min(1, Math.pow(positionMag, 1.0));
      mass.arrays.color[1] =
        mass.color[1] * Math.min(1, Math.pow(positionMag, 1.0));
      mass.arrays.color[2] =
        mass.color[2] * Math.min(1, Math.pow(positionMag, 1.0));
    }
    this.steps++;
  }
}

const { canvas, regl } = demo.initialize();

const interleavedStripRoundCapJoin3DDEMO = commands.interleavedStripRoundCapJoin3DDEMO(
  regl,
  16
);

const model = mat4.create();
const view = mat4.lookAt([], [50, 50, 50], [0, 0, 0], [0, 1, 0]);
const projection = mat4.perspective(
  [],
  Math.PI / 3,
  canvas.width / canvas.height,
  0.01,
  100
);
const viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height };

let sim = new Simulation(10, 1000, 0.0125);
sim.step();

window.addEventListener("mousedown", () => {
  if (animate === true){
    animate = false;
  }
  else {
    sim = new Simulation(10, 1000, 0.0125);
    animate = true;
  }
});

let animate = true;
window.addEventListener("mouseover", () => {
  animate = true;
});

window.addEventListener("mouseout", () => {
  animate = true;
});

const buffers = [];
for (const mass of sim.masses) {
  buffers.push({
    position: regl.buffer(mass.arrays.position),
    color: regl.buffer(mass.arrays.color)
  });
}

function renderLoop() {
  requestAnimationFrame(renderLoop);
  if (!animate && sim.steps > 100) return;
  mat4.rotateY(model, model, 0.004);
  for (let i = 0; i < 3; i++) {
    sim.step();
  }
  regl.clear({ color: [0, 0, 0, 0] });
  for (let i = 0; i < sim.nMasses; i++) {
    buffers[i].position({ data: sim.masses[i].arrays.position });
    buffers[i].color({ data: sim.masses[i].arrays.color });
    interleavedStripRoundCapJoin3DDEMO({
      points: buffers[i].position,
      color: buffers[i].color,
      width: sim.masses[i].mass * 3,
      model: model,
      view,
      projection,
      resolution: [canvas.width*2, canvas.height*2],
      segments: Math.min(sim.history - 1, sim.steps - 1),
      viewport
    });
  }
}

requestAnimationFrame(renderLoop);
