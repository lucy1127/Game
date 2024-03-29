function agentMesh () {
	// mesh facing +x
	let points = [];
	points.push (new THREE.Vector3(10,0,0), new THREE.Vector3(0,0,-3), 
	new THREE.Vector3(0,0,3), new THREE.Vector3(0,3,0));
	let geometry = new THREE.BufferGeometry().setFromPoints (points);

	let indices = [];
	indices.push (0,3,2, 0,2,1, 1,3,0, 1,2,3);
	geometry.setIndex (indices);
	geometry.computeFaceNormals();
	return new THREE.Mesh (geometry, 
	new THREE.MeshBasicMaterial({color:'cyan', wireframe:true}))  
}

class Agent {
  constructor(pos, halfSize) {
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    this.force = new THREE.Vector3();
    this.target = null;
    this.halfSize = halfSize;  // half width
    this.mesh = agentMesh ();
    this.MAXSPEED = 2500;
    this.ARRIVAL_R = 10;
    
    // for orientable agent
    this.angle = 0;
    scene.add (this.mesh);
  }
  
  update(dt) {
  
  	// about target ...
  	if (this.target === null || this.target.found === true) {  // no more target OR target found by other agent
  	  console.log ('find target');
  		this.findTarget();
  		return;  // wait for next turn ...
  	}

    this.accumulateForce();
    // collision
    // for all obstacles in the scene
    let obs = scene.obstacles;

	let vhat = this.vel.clone().normalize();
	const REACH = Math.max(this.vel.length() * 0.2,20);
	const K = Math.max(this.vel.length() * 0.5,100);
	for (let i = 0; i < obs.length; i++) {
		let point = scene.obstacles[i].center.clone().sub (this.pos); // c-p
		let proj  = point.dot(vhat);
		if (proj > 0 && proj < REACH) {
		  let perp = new THREE.Vector3();
		  perp.subVectors (point, vhat.clone().setLength(proj));
		  let overlap = scene.obstacles[i].size + this.halfSize - perp.length();
		  if (overlap > 0) {
			  perp.setLength (K*overlap);
			  perp.negate();
			  this.force.add (perp);
			  console.log ("hit:", perp);
		  }
		}
	}
	
	// Euler's method       
    this.vel.add(this.force.clone().multiplyScalar(dt));

	this.ARRIVAL_R = Math.max(10, this.vel.length() * 0.175);
    // velocity modulation
    let diff = this.target.pos.clone().sub(this.pos)
    let dst = diff.length();
    if (dst < this.ARRIVAL_R) {
      this.vel.setLength(Math.max(dst,15));
      const REACH_TARGET = 5;
      if (dst < REACH_TARGET) {// target reached
      	console.log ('target reached');
         this.target.setFound (this);
         this.target = null;
      }
    }
    
    // Euler
    this.pos.add(this.vel.clone().multiplyScalar(dt))
    this.mesh.position.copy(this.pos)
    
    // for orientable agent
    // non PD version
    if (this.vel.length() > 0.1) {
		this.angle = Math.atan2 (-this.vel.z, this.vel.x)
		this.mesh.rotation.y = this.angle
   	}
  }

  findTarget () {
  	console.log ('total: ' + scene.targets.length)
  	let allTargets = scene.targets;
  	let minD = 1e10;
  	let d;
  	for (let i = 0; i < allTargets.length; i++) {
  		d = this.pos.distanceTo (allTargets[i].pos)
  		if (d < minD) {
  			minD = d;
  			this.setTarget (allTargets[i])
  		}
  	}
	 this.target.attack();
  }
  
  setTarget(target) {
    this.target = target;
  }
  targetInducedForce(targetPos) {
    return targetPos.clone().sub(this.pos).normalize().multiplyScalar(this.MAXSPEED).sub(this.vel)
  }

  accumulateForce() {
    // seek
    this.force.copy(this.targetInducedForce(this.target.pos));
  }

}