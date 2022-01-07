import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'dat.gui'
import CANNON from 'cannon'

const scene = new THREE.Scene()







// Canvas
const canvas = document.querySelector('canvas.webgl')

// /**
//  * Sizes
//  */
 const sizes = {
     width: window.innerWidth,
     height: window.innerHeight
 }

 window.addEventListener('resize', () =>
 {
      //Update sizes
     sizes.width = window.innerWidth
     sizes.height = window.innerHeight

      //Update camera
     camera.aspect = sizes.width / sizes.height
     camera.updateProjectionMatrix()

      //Update renderer
     renderer.setSize(sizes.width, sizes.height)
     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
 })


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled=true
renderer.shadowMap.type=THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// /**plane

var geometry = new THREE.PlaneGeometry(10, 10, 10);
var material = new THREE.MeshBasicMaterial({color: 'grey', side: THREE.DoubleSide});
var plane = new THREE.Mesh(geometry, material);
plane.rotation.x = Math.PI/2;
scene.add(plane);


//light
var sunlight = new THREE.DirectionalLight(0xffffff, 1.0);
sunlight.position.set(-10, 10, 0);
scene.add(sunlight)

/**
* Physics
**/

var world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.gravity.set(0, -10, 0);
world.defaultContactMaterial.friction = 0;

var groundMaterial = new CANNON.Material('groundMaterial');
var wheelMaterial = new CANNON.Material('wheelMaterial');
var wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 0.3,
    restitution: 0,
    contactEquationStiffness: 1000,
});

world.addContactMaterial(wheelGroundContactMaterial);

// car physics body
var chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.3, 2));
var chassisBody = new CANNON.Body({mass: 150});
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 0.2, 0);
chassisBody.angularVelocity.set(0, 0, 0); // initial velocity

// car visual body
var geometry = new THREE.BoxGeometry(1, 0.3, 2); // double chasis shape
var material = new THREE.MeshBasicMaterial({color: 0xffff00});
var box = new THREE.Mesh(geometry, material);
scene.add(box);
 
// parent vehicle object
var vehicle = new CANNON.RaycastVehicle({
  chassisBody: chassisBody,
  indexRightAxis: 0, // x
  indexUpAxis: 1, // y
  indexForwardAxis: 1, // z
});

// wheel options
var options = {
  radius: 0.4,
  directionLocal: new CANNON.Vec3(0, -1, 0),
  suspensionStiffness: 45,
  suspensionRestLength: 0.4,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.5,
  maxSuspensionForce: 200000,
  rollInfluence:  0.01,
  axleLocal: new CANNON.Vec3(-1, 0, 0),
  chassisConnectionPointLocal: new CANNON.Vec3(1, 2, 0),
  maxSuspensionTravel: 0.25,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,
};

var axlewidth = 0.7;

//positioning the wheels
options.chassisConnectionPointLocal.set(axlewidth, 0, -1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-axlewidth, 0, -1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(axlewidth, 0, 1);
vehicle.addWheel(options);

options.chassisConnectionPointLocal.set(-axlewidth, 0, 1);
vehicle.addWheel(options);

vehicle.addToWorld(world);

// car wheels
var wheelBodies = [],
    wheelVisuals = [];
vehicle.wheelInfos.forEach(function(wheel) {
  var shape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
  var body = new CANNON.Body({mass: 1, material: wheelMaterial});
  var q = new CANNON.Quaternion();
  q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  body.addShape(shape, new CANNON.Vec3(), q);
  wheelBodies.push(body);
  // wheel visual body
  var geometry = new THREE.CylinderGeometry( wheel.radius, wheel.radius, 0.4, 32 );
  var material = new THREE.MeshPhongMaterial({
    color: 0xd0901d,
    emissive: 0xaa0000,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  var cylinder = new THREE.Mesh(geometry, material);
  cylinder.geometry.rotateZ(Math.PI/2);
  wheelVisuals.push(cylinder);
  scene.add(cylinder);
});

// update the wheels to match the physics
world.addEventListener('postStep', function() {
  for (var i=0; i<vehicle.wheelInfos.length; i++) {
    vehicle.updateWheelTransform(i);
    var t = vehicle.wheelInfos[i].worldTransform;
    // update wheel physics
    wheelBodies[i].position.copy(t.position);
    wheelBodies[i].quaternion.copy(t.quaternion);
    // update wheel visuals
    wheelVisuals[i].position.copy(t.position);
    wheelVisuals[i].quaternion.copy(t.quaternion);
  }
});

//plane physics

var q = plane.quaternion;
var planeBody = new CANNON.Body({
  mass: 0, // mass = 0 makes the body static
  material: groundMaterial,
  shape: new CANNON.Plane(),
  quaternion: new CANNON.Quaternion(-q._x, q._y, q._z, q._w)
});
world.add(planeBody)

/**
* Main
**/

function updatePhysics() {
  world.step(1/60);
  // update the chassis position
  box.position.copy(chassisBody.position);
  box.quaternion.copy(chassisBody.quaternion);
}

 /**
  * Camera
  */

//third person camera
var camera, goal;
var test=10//camera disctance from the car
var temp = new THREE.Vector3;
camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
camera.position.set( 0, test, - test );
camera.lookAt( scene.position );
goal = new THREE.Object3D;
box.add( goal );
goal.position.set(0, test, -test);



  //Controls
 const controls = new OrbitControls(camera, canvas)
 controls.enableDamping = true


function navigate(e) {
  if (e.type != 'keydown' && e.type != 'keyup') ;
  var keyup = e.type == 'keyup';

  //optionnal
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 1);
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  var engineForce = 500,
      maxSteerVal = 0.7;
  switch(e.keyCode) {

    case 38: // forward
      vehicle.applyEngineForce(keyup ? 0 : -engineForce, 2);
      vehicle.applyEngineForce(keyup ? 0 : -engineForce, 3);
      break;

    case 40: // backward
      vehicle.applyEngineForce(keyup ? 0 : engineForce, 2);
      vehicle.applyEngineForce(keyup ? 0 : engineForce, 3);
      break;

    case 39: // right
      vehicle.setSteeringValue(keyup ? 0 : -maxSteerVal, 2);
      vehicle.setSteeringValue(keyup ? 0 : -maxSteerVal, 3);
      break;

    case 37: // left
      vehicle.setSteeringValue(keyup ? 0 : maxSteerVal, 2);
      vehicle.setSteeringValue(keyup ? 0 : maxSteerVal, 3);
      break;
  }
}

window.addEventListener('keydown', navigate)
window.addEventListener('keyup', navigate)



//////////////////////////////////////////////

const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

//  * Animate
//  */
// const clock = new THREE.Clock()
// var oldElaspsedTime=0

const tick = () =>
{
    // Render
  renderer.render(scene, camera)

    // Call tick again on the next frame
  window.requestAnimationFrame(tick)


  updatePhysics();
  controls.update()

  temp.setFromMatrixPosition(goal.matrixWorld);
  camera.position.lerp(temp, 0.2);
  camera.lookAt( box.position );


}

tick()