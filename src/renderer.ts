import * as THREE from 'three';
import type { ClimbSimulation, LimbId, Vec2 } from './simulation';
import { BIOMES } from './biomes';

const IDS: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
const UP = new THREE.Vector3(0, 1, 0);
const temp = new THREE.Vector3();
type LimbMeshes = { upper: THREE.Mesh; lower: THREE.Mesh; joint: THREE.Mesh; end: THREE.Group };

export class ClimbRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
  readonly handles = {} as Record<LimbId, HTMLButtonElement>;
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private limbs = {} as Record<LimbId, LimbMeshes>;
  private sections: THREE.Group[] = [];
  private particles: THREE.Points;
  private cameraY = 2.8;
  private halfHeight = 4.1;
  private scenery: HTMLDivElement;
  private observer: ResizeObserver;
  private time = 0;

  constructor(private host: HTMLElement, private sim: ClimbSimulation, private onContextLost: () => void) {
    this.scenery = document.createElement('div');
    this.scenery.className = 'scenery';
    this.scenery.innerHTML = '<div class="scenery-art"></div><div class="scenery-clouds"></div><div class="scenery-stars"></div>';
    host.prepend(this.scenery);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.domElement.className = 'world-canvas';
    this.renderer.domElement.setAttribute('aria-label', '竹とぐにゃぐにゃの登山者を描画する3D画面');
    host.prepend(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.onContextLost(); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
    this.scene.add(new THREE.HemisphereLight(0xfff8df, 0x60704b, 2.3));
    const sun = new THREE.DirectionalLight(0xfff1d3, 3.4); sun.position.set(-3, 7, 6); this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd9eee4, 1.1); fill.position.set(4, 0, 4); this.scene.add(fill);
    this.createBamboo(); this.createClimber();
    const positions = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i++) { positions[i*3] = Math.sin(i*19.4)*4; positions[i*3+1] = (i/36)*12; positions[i*3+2] = -1-Math.abs(Math.sin(i))*2; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xfffad5, size: .027, transparent: true, opacity: .65, depthWrite: false }));
    this.scene.add(this.particles);
    for (const id of IDS) {
      const handle = document.createElement('button'); handle.className = 'limb-handle gripped'; handle.dataset.limb = id;
      const isHand = id.includes('Hand'); const left = id.startsWith('left');
      handle.innerHTML = `<span class="handle-dot">${isHand ? '✳' : '⌁'}</span><span class="handle-label">${left ? '左' : '右'}${isHand ? '手' : '足'}</span>`;
      handle.setAttribute('aria-label', `${left ? '左' : '右'}${isHand ? '手' : '足'}。ドラッグ、または選択して矢印キーで移動、Enterでつかむ`);
      this.handles[id] = handle; host.append(handle);
    }
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }

  private material(color: number, roughness = .8) { return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }); }
  private sphere(parent: THREE.Object3D, radius: number, material: THREE.Material, position: number[], scale = [1,1,1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12), material);
    mesh.position.set(position[0], position[1], position[2]); mesh.scale.set(scale[0],scale[1],scale[2]); parent.add(mesh); return mesh;
  }
  private createBamboo() {
    const green = this.material(0x778e3c); const rim = this.material(0xb6c779); const shadow = this.material(0x4b6534);
    const cylinder = new THREE.CylinderGeometry(.225, .25, 2.17, 18);
    const ring = new THREE.TorusGeometry(.247, .032, 6, 20);
    const stripeGeo = new THREE.CylinderGeometry(.228, .253, 2.1, 18, 1, true, .35, .16);
    const stripeMat = this.material(0xa4b65a);
    const leafGeo = new THREE.SphereGeometry(1, 8, 6); const leafMat = this.material(0x6c873e);
    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group(); group.add(new THREE.Mesh(cylinder,green));
      const stripe = new THREE.Mesh(stripeGeo,stripeMat); stripe.position.z=.007; group.add(stripe);
      const node = new THREE.Mesh(ring,rim); node.rotation.x=Math.PI/2; node.position.y=1.08; group.add(node);
      const nodeShadow = new THREE.Mesh(new THREE.CylinderGeometry(.252,.252,.06,18),shadow); nodeShadow.position.y=1.02; group.add(nodeShadow);
      if (i % 4 === 0) {
        const branch = new THREE.Group(); branch.position.set(.12,.9,-.12);
        for (let j=0;j<6;j++) { const leaf=new THREE.Mesh(leafGeo,leafMat); leaf.scale.set(.055,.3,.025); leaf.rotation.z=-.5-j*.28; leaf.position.set(.1+j*.095,Math.sin(j*.5)*.15,0); branch.add(leaf); }
        if(i%8===0) branch.scale.x=-1; group.add(branch);
      }
      this.sections.push(group); this.scene.add(group);
    }
  }
  private createClimber() {
    const jacket=this.material(0xeac149), skin=this.material(0xf0be97), pants=this.material(0x43636b), shoes=this.material(0xc36748), hat=this.material(0xc66a41), dark=this.material(0x263c32);
    this.sphere(this.torso,.32,jacket,[0,.02,.48],[.83,1.45,.72]);
    this.sphere(this.torso,.24,pants,[0,-.3,.47],[1,.65,.8]);
    // Jacket zipper, collar and little practical pockets.
    const zip=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.54,6),this.material(0xb19436)); zip.position.set(0,.05,.715); this.torso.add(zip);
    for(const side of [-1,1]) { const pocket=new THREE.Mesh(new THREE.BoxGeometry(.12,.105,.03),this.material(0xd4a93c)); pocket.position.set(side*.125,-.08,.70);this.torso.add(pocket); }
    this.sphere(this.torso,.105,skin,[0,.48,.49],[.8,1,1]);
    this.sphere(this.head,.22,skin,[0,0,0],[.92,1.03,.92]);
    this.sphere(this.head,.228,hat,[0,.10,-.012],[1,.65,1.01]);
    const brim=new THREE.Mesh(new THREE.TorusGeometry(.208,.037,8,24),hat); brim.rotation.x=Math.PI/2; brim.position.y=.08; this.head.add(brim);
    this.sphere(this.head,.055,hat,[0,.26,-.01]);
    for(const x of [-.075,.075]) this.sphere(this.head,.018,dark,[x,.005,.19],[1,1.3,.6]);
    this.sphere(this.head,.04,skin,[0,-.048,.212],[.65,.7,.7]);
    const smileCurve=new THREE.EllipseCurve(0,0,.043,.025,Math.PI,Math.PI*2,false,0);
    const smilePoints=smileCurve.getPoints(12).map(p=>new THREE.Vector3(p.x,p.y-.075,.19));
    this.head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(smilePoints),new THREE.LineBasicMaterial({color:0x94644d})));
    this.torso.add(this.head); this.head.position.set(0,.7,.49); this.scene.add(this.torso);
    for(const id of IDS) {
      const hand=id.includes('Hand');
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(hand?.075:.095,hand?.085:.10,1,10),hand?jacket:pants);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(hand?.06:.075,hand?.072:.09,1,10),hand?skin:pants);
      const joint=new THREE.Mesh(new THREE.SphereGeometry(hand?.077:.095,12,8),hand?jacket:pants);
      const end=new THREE.Group();this.sphere(end,hand?.085:.105,hand?skin:shoes,[hand?0:.045,0,0],hand?[1,.95,.85]:[1.6,.7,1]);
      this.scene.add(upper,lower,joint,end);this.limbs[id]={upper,lower,joint,end};
    }
  }
  private bone(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
    mesh.position.copy(a).add(b).multiplyScalar(.5); const delta=b.clone().sub(a); mesh.scale.y=delta.length(); mesh.quaternion.setFromUnitVectors(UP,delta.normalize());
  }
  resize() {
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    this.halfHeight = w<500 ? 3.9 : 4.1;
    const aspect=w/h;this.camera.left=-this.halfHeight*aspect;this.camera.right=this.halfHeight*aspect;this.camera.top=this.halfHeight;this.camera.bottom=-this.halfHeight;
    this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);
  }
  screenToWorld(clientX:number,clientY:number):Vec2 {
    const box=this.host.getBoundingClientRect();temp.set((clientX-box.left)/box.width*2-1,-(clientY-box.top)/box.height*2+1,0).unproject(this.camera);
    return {x:temp.x,y:temp.y};
  }
  setBiome(index:number) {
    this.scenery.dataset.biome=String(index);
    const skies=[
      'linear-gradient(#eeeace,#d9e2c7)',
      'linear-gradient(#c9dbe1,#e3e9dc)',
      'linear-gradient(#80bad4,#d6eaf1)',
      'radial-gradient(circle at 73% 35%,#ffefae 0 6%,transparent 6.3%),linear-gradient(#b484a2,#f4c5a0 73%,#fae0b8)',
      'radial-gradient(ellipse at 25% 80%,#41426e,transparent 70%),linear-gradient(#111b36,#29365c)',
    ];
    this.scenery.style.background=skies[index];
    this.host.style.setProperty('--biome-ink',BIOMES[index].ink);
  }
  update(dt:number) {
    this.time+=dt;
    const targetY=Math.max(2.8,this.sim.body.y+1.15);
    this.cameraY+=(targetY-this.cameraY)*(1-Math.exp(-dt*4));
    this.camera.position.set(0,this.cameraY,12);this.camera.lookAt(0,this.cameraY,0);this.camera.updateMatrixWorld();
    const base=Math.floor(this.cameraY/2.2)-6;
    this.sections.forEach((section,i)=>{section.position.y=(base+i)*2.2;});
    const body=this.sim.body;
    this.torso.position.set(body.x,body.y,0);this.torso.rotation.z=this.sim.bodyAngle;
    this.head.rotation.z=Math.sin(this.time*1.3)*.025-this.sim.bodyAngle*.35;
    for(const id of IDS) {
      const limb=this.sim.limbs[id],hand=id.includes('Hand'),side=id.startsWith('left')?-1:1;
      const attachment=this.sim.rootFor(id);
      const root=new THREE.Vector3(attachment.x,attachment.y,.46);
      const end=new THREE.Vector3(limb.pos.x,limb.pos.y,.57);
      const delta=end.clone().sub(root),distance=delta.length();
      const bend=Math.sqrt(Math.max(.015,(hand?.66:.7)**2-(distance*.5)**2));
      const midpoint=root.clone().add(end).multiplyScalar(.5);
      midpoint.x+=side*bend*(limb.gripped?.9:1.2);midpoint.y+=hand?-.10:.08;midpoint.z+=.12;
      if(!limb.gripped) midpoint.x+=Math.sin(this.time*5+(hand?0:2))* .07;
      const meshes=this.limbs[id];this.bone(meshes.upper,root,midpoint);this.bone(meshes.lower,midpoint,end);meshes.joint.position.copy(midpoint);meshes.end.position.copy(end);
      const p=end.clone().project(this.camera); const handle=this.handles[id];
      handle.style.left=`calc(${(p.x*.5+.5)*100}% + ${side*24}px)`;handle.style.top=`${(-p.y*.5+.5)*100}%`;
      handle.classList.toggle('gripped',limb.gripped);handle.classList.toggle('dragging',limb.dragging);handle.classList.toggle('strained',limb.strain>.7);
      handle.disabled=this.sim.status!=='playing'&&this.sim.status!=='falling';
      handle.style.visibility=Math.abs(p.y)>1.1||Math.abs(p.x)>1.1?'hidden':'visible';
    }
    this.particles.position.y=this.cameraY-4+(this.time*.045)%2;this.particles.rotation.z=Math.sin(this.time*.1)*.025;
    this.renderer.render(this.scene,this.camera);
  }
  dispose() { this.observer.disconnect(); this.renderer.dispose(); }
}
