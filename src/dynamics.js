const { vec3, mat4, vec4} = require("gl-matrix");
const demo = require("./demo");
const commands = require("./commands");
//const ccapture = require("ccapture");

//const CanvasGifEncoder = require('canvas-gif-encoder')
//const {createCanvas} = require('canvas')

class Simulation {
  constructor(nMasses, history, dt) {
    this.dt = dt;
    this.nMasses = nMasses;
    this.history = history;
    this.masses = [];
    this.steps = 0;
    //this.sigma = 10;
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

  step(dynclass=0, sigma=10) {
    for (let j = 0; j < this.nMasses; j++) {
      const mj = this.masses[j];
      if (vec3.length(mj.position) > 100){
        mj.position = vec3.random([], 10);
      }
      // this is where we do dynamics!
      if (dynclass===1){
        vec3.set(mj.cpos,
          mj.position[1],
          -mj.position[0] + mj.position[1] * mj.position[2],
          sigma - Math.pow(mj.position[1],2))
      }
      else if (dynclass===0) {
        vec3.set(mj.cpos,
          sigma * (mj.position[1] - mj.position[0]),
          mj.position[0] * (this.rho - mj.position[2]) - mj.position[1],
          mj.position[0] * mj.position[1] - this.beta * mj.position[2])
      }
      vec3.scale(mj.cpos, mj.cpos, 0.2)
      
    }
    for (const mass of this.masses) {
      vec3.scaleAndAdd(
        mass.velocity,
        mass.velocity,
        mass.cpos,
        this.dt
      );
      vec3.normalize(mass.velocity, mass.velocity);
      //if (vec3.length(mass.velocity) > 1.0) {
      //  vec3.normalize(mass.velocity, mass.velocity);
      //}
      vec3.scaleAndAdd(mass.position, mass.position, mass.cpos, this.dt);
      mass.arrays.position.copyWithin(3, 0);
      mass.arrays.position[0] = mass.position[0];
      mass.arrays.position[1] = mass.position[1];
      mass.arrays.position[2] = mass.position[2];
      
      mass.arrays.color.copyWithin(3, 0);
      const positionMag = Math.max(0.125, vec3.length(mass.velocity) - 0.5);
      mass.arrays.color[0] = Math.min(1, positionMag);
        //mass.color[0] * Math.min(1, Math.pow(positionMag, 1.0));
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
const view = mat4.lookAt([], [0, 0, 80], [0, 0, 0], [0, 1, 0]);
const projection = mat4.perspective(
  [],
  Math.PI / 3,
  canvas.width / canvas.height,
  0.01,
  200
);
const viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height };

let sigma = 10;
let width_lines = 5;
let dynclass = 0;
window.addEventListener("keyup", (event) => {
  if (event.key == 'ArrowLeft'){
    sigma -= 1;
  }
  else if (event.key == 'ArrowRight'){
    sigma += 1;
  }
  else if (event.key == 'ArrowDown'){
    width_lines -= 0.5;
  }
  else if (event.key == 'ArrowUp'){
    width_lines += 0.5;
  }
  else if (event.key == 'A') {
    dynclass += 1;
    dynclass = dynclass % 3;
  }
  else if (event.key == 'b'){
    for (const mass of sim.masses) {
      vec3.scaleAndAdd(
        mass.position,
        mass.position,
        vec3.random([], 10),
        1
      );
    }
  }  
  else if (event.key == 'y') {
        do_y_rotation = !do_y_rotation
  }
})

let sim = new Simulation(20, 500, 0.0100);
let do_y_rotation = true
sim.step();

window.addEventListener("mousedown", () => {
  if (animate === true){
    animate = false;
  }
  else {
    sim = new Simulation(20, 500, 0.0100);
    animate = true;
  }
});

let animate = true;
window.addEventListener("mouseover", () => {
  animate = true;
});

window.addEventListener("mouseout", () => {
  animate = false;
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
  if (do_y_rotation === true) {
    mat4.rotateY(model, model, 0.004);
  }
  for (let i = 0; i < 3; i++) {
    sim.step(dynclass,sigma);
  }
  regl.clear({ color: [0, 0, 0, 0] });
  for (let i = 0; i < sim.nMasses; i++) {
    buffers[i].position({ data: sim.masses[i].arrays.position });
    buffers[i].color({ data: sim.masses[i].arrays.color });
    interleavedStripRoundCapJoin3DDEMO({
      points: buffers[i].position,
      color: buffers[i].color,
      width: sim.masses[i].mass * width_lines,
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
