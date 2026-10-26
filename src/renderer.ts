import * as THREE from 'three';
import { BASE_HEIGHT, type ClimbSimulation, type LimbId, type Vec2 } from './simulation';
import { BIOMES } from './biomes';
import { MOON_HEIGHT, CHECKPOINTS } from './race';

const IDS: LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
const UP = new THREE.Vector3(0, 1, 0);
const temp = new THREE.Vector3();
const BAMBOO_TOP = BASE_HEIGHT + MOON_HEIGHT + 1.9;
type LimbMeshes = { upper: THREE.Mesh; lower: THREE.Mesh; joint: THREE.Mesh; end: THREE.Group };

export class ClimbRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
  readonly handles = {} as Record<LimbId, HTMLButtonElement>;
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private hair = new THREE.Group();
  private limbs = {} as Record<LimbId, LimbMeshes>;
  private sections: THREE.Group[] = [];
  private moon = new THREE.Group();
  private moonGlow!: THREE.MeshBasicMaterial;
  private landing = new THREE.Group();
  private milestones: { height: number; group: THREE.Group; material: THREE.MeshBasicMaterial }[] = [];
  private obiMaterial!: THREE.MeshStandardMaterial;
  private boosted = false;
  private finished = false;
  private combo = 0;
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
    this.renderer.domElement.setAttribute('aria-label', '月に向かう竹と、背中を向けて登るかぐや姫を描画する3D画面');
    host.prepend(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.onContextLost(); });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
    this.scene.add(new THREE.HemisphereLight(0xfff8df, 0x60704b, 2.3));
    const sun = new THREE.DirectionalLight(0xfff1d3, 3.4); sun.position.set(-3, 7, 6); this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd9eee4, 1.1); fill.position.set(4, 0, 4); this.scene.add(fill);
    this.createBamboo(); this.createClimber(); this.createMoon(); this.createMilestones();
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
    for (let i = 0; i < 9; i++) {
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
    const cutEnd = new THREE.Mesh(new THREE.CylinderGeometry(.215,.215,.018,18), this.material(0x4f6435));
    cutEnd.position.y = BAMBOO_TOP; this.scene.add(cutEnd);
    const cutRim = new THREE.Mesh(ring,rim); cutRim.rotation.x = Math.PI/2; cutRim.position.y = BAMBOO_TOP;
    this.scene.add(cutRim);
  }
  private createClimber() {
    const ivory=this.material(0xffefdf,.72), blush=this.material(0xe4adc1,.72), mauve=this.material(0xa781ae), skin=this.material(0xf2cfb3), black=this.material(0x171624,.24), gold=this.material(0xf7d778,.42), sole=this.material(0x80525b);
    this.obiMaterial=this.material(0xb82c4f,.62);
    this.obiMaterial.emissive.setHex(0x722342);
    // Her face is toward the bamboo (-Z). The camera sees her hair and obi bow.
    this.sphere(this.torso,.32,ivory,[0,.02,.48],[.88,1.45,.75]);
    this.sphere(this.torso,.26,blush,[0,-.29,.48],[1.08,.88,.82]);
    for(const side of [-1,1]) {
      const lapel=new THREE.Mesh(new THREE.BoxGeometry(.10,.48,.055),blush);
      lapel.position.set(side*.19,.08,.64); lapel.rotation.z=side*.2; this.torso.add(lapel);
      const skirt=new THREE.Mesh(new THREE.ConeGeometry(.115,.40,8),ivory);
      skirt.position.set(side*.18,-.40,.49); skirt.rotation.z=side*.18; this.torso.add(skirt);
    }
    this.sphere(this.torso,.27,this.obiMaterial,[0,-.10,.49],[1.06,.44,.91]);
    for(const side of [-1,1]) {
      const wing=this.sphere(this.torso,.15,this.obiMaterial,[side*.12,-.11,.81],[1.05,.70,.34]); wing.rotation.z=side*.35;
      const ribbon=new THREE.Mesh(new THREE.BoxGeometry(.083,.21,.035),this.obiMaterial);
      ribbon.position.set(side*.065,-.29,.81); ribbon.rotation.z=side*.21; this.torso.add(ribbon);
    }
    this.sphere(this.torso,.065,gold,[0,-.11,.875],[.70,.75,.35]);
    this.sphere(this.torso,.09,skin,[0,.47,.46],[.8,1,1]);
    this.sphere(this.head,.215,skin,[0,-.015,-.045],[.93,1.02,.92]);
    this.sphere(this.head,.23,black,[0,.025,.015],[1,1.04,.96]);
    // One glossy, tapered fall of hair reaches mid-back without covering the red bow.
    this.hair.position.set(0,.04,.13);
    this.sphere(this.hair,.218,black,[0,-.28,0],[.96,1.86,.50]);
    this.sphere(this.hair,.16,black,[0,-.54,.005],[1.08,.75,.58]);
    this.head.add(this.hair);
    for(const side of [-1,1]) {
      const hairLock=this.sphere(this.head,.075,black,[side*.195,-.22,.045],[.60,3.4,.65]); hairLock.rotation.z=side*.065;
    }
    const hairCrescent=new THREE.Mesh(new THREE.TorusGeometry(.12,.027,6,22,Math.PI*1.58),gold);
    hairCrescent.rotation.z=-.70; hairCrescent.position.set(0,.14,.241); this.head.add(hairCrescent);
    this.sphere(this.head,.038,gold,[0,.285,.04],[.65,1.35,.65]);
    this.torso.add(this.head); this.head.position.set(0,.7,.49); this.scene.add(this.torso);
    for(const id of IDS) {
      const hand=id.includes('Hand');
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(hand?.105:.112,hand?.12:.12,1,10),hand?ivory:mauve);
      const lower=new THREE.Mesh(new THREE.CylinderGeometry(hand?.12:.085,hand?.075:.10,1,10),hand?ivory:blush);
      const joint=new THREE.Mesh(new THREE.SphereGeometry(hand?.112:.113,12,8),hand?ivory:mauve);
      const end=new THREE.Group();
      this.sphere(end,hand?.08:.085,skin,[hand?0:.035,0,0],hand?[1,.95,.85]:[1.65,.65,1]);
      if(hand) {
        const cuff=new THREE.Mesh(new THREE.TorusGeometry(.074,.012,5,12),blush); cuff.rotation.x=Math.PI/2; end.add(cuff);
      } else {
        this.sphere(end,.09,sole,[.035,-.047,0],[1.7,.23,1.02]);
        for(const side of [-1,1]) {
          const strap=new THREE.Mesh(new THREE.BoxGeometry(.09,.023,.018),this.obiMaterial); strap.position.set(.04+side*.03,.035,.05); strap.rotation.z=side*.55; end.add(strap);
        }
      }
      this.scene.add(upper,lower,joint,end);this.limbs[id]={upper,lower,joint,end};
    }
  }
  private createMoon() {
    this.moonGlow=new THREE.MeshBasicMaterial({color:0xffdfaa,transparent:true,opacity:.15,depthWrite:false,blending:THREE.AdditiveBlending});
    const halo=new THREE.Mesh(new THREE.CircleGeometry(1.45,40),this.moonGlow); halo.position.z=-.08; this.moon.add(halo);
    const outerGlow=new THREE.Mesh(new THREE.CircleGeometry(1.75,40),new THREE.MeshBasicMaterial({color:0xffdeba,transparent:true,opacity:.055,depthWrite:false,blending:THREE.AdditiveBlending}));
    outerGlow.position.z=-.10; this.moon.add(outerGlow);
    const moonSurface=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),new THREE.MeshBasicMaterial({color:0xffefc4})); this.moon.add(moonSurface);
    const craterMaterial=new THREE.MeshBasicMaterial({color:0xd9d0b5,transparent:true,opacity:.49});
    const craterRim=new THREE.MeshBasicMaterial({color:0xfff7db,transparent:true,opacity:.8});
    const craters=[[-.31,.40,.14],[.33,.12,.20],[-.41,-.26,.23],[.15,-.48,.12],[.39,.56,.08],[-.04,.07,.065],[.58,-.31,.075]];
    for(const [x,y,radius] of craters) {
      const z=Math.sqrt(1-x*x-y*y);
      const crater=new THREE.Mesh(new THREE.CircleGeometry(radius,16),craterMaterial); crater.position.set(x,y,z+.009); crater.scale.y=.83; this.moon.add(crater);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(radius,.012,4,16,Math.PI*1.25),craterRim);
      rim.position.set(x,y+.012,z+.013); rim.scale.y=.83; rim.rotation.z=1.0; this.moon.add(rim);
    }
    this.scene.add(this.moon);
    const moonRock=this.material(0xcbd0de,.93), moonTop=this.material(0xeff0e8,.95);
    this.sphere(this.landing,2,moonRock,[0,-.13,-.35],[1.65,.16,.72]);
    this.sphere(this.landing,1.85,moonTop,[0,.015,-.30],[1.68,.12,.73]);
    for(let i=0;i<6;i++) {
      const rock=this.sphere(this.landing,.10+(i%3)*.035,moonRock,[Math.sin(i*2.3)*2.3,.18,-.40-Math.abs(Math.cos(i*2.4))*.65],[1.1,.5,1]); rock.rotation.z=i;
    }
    const landingGlow=new THREE.Mesh(new THREE.PlaneGeometry(5.7,1.5),new THREE.MeshBasicMaterial({color:0xf7e1a6,transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending}));
    landingGlow.position.set(0,.23,-1.4); this.landing.add(landingGlow);
    this.landing.position.set(0,BASE_HEIGHT+MOON_HEIGHT-1.15,-.40); this.scene.add(this.landing);
  }
  private createMilestones() {
    for(const height of [...CHECKPOINTS,MOON_HEIGHT]) {
      const group=new THREE.Group(); group.position.y=BASE_HEIGHT+height;
      const material=new THREE.MeshBasicMaterial({color:0xd4bd79,transparent:true,opacity:.6});
      for(const side of [-1,1]) {
        const crescent=new THREE.Mesh(new THREE.TorusGeometry(height===24?.18:.12,.022,5,18,Math.PI*1.55),material);
        crescent.rotation.z=-.7; crescent.position.set(side*.52,.06,.02); group.add(crescent);
        const ribbon=new THREE.Mesh(new THREE.BoxGeometry(.18,.028,.018),material); ribbon.position.set(side*.36,-.15,.05); ribbon.rotation.z=side*.35; group.add(ribbon);
      }
      this.scene.add(group); this.milestones.push({height,group,material});
    }
  }
  setRaceFeedback(combo:number,boosted:boolean,finished:boolean) {
    this.combo=combo; this.boosted=boosted; this.finished=finished;
    this.obiMaterial.emissiveIntensity=finished?.75:boosted?.45:.07;
    const sparks=this.particles.material as THREE.PointsMaterial;
    sparks.color.setHex(finished?0xffecaf:boosted?0xffd87c:0xfffad5);
    sparks.size=boosted||finished?.042:.027;
  }
  private bone(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
    mesh.position.copy(a).add(b).multiplyScalar(.5); const delta=b.clone().sub(a); mesh.scale.y=delta.length(); mesh.quaternion.setFromUnitVectors(UP,delta.normalize());
  }
  resetCamera():void {
    this.cameraY=Math.max(2.8,this.sim.body.y+1.15);
    this.update(0);
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
      'linear-gradient(#e7e6d1,#d9e2c7)',
      'linear-gradient(#bfcfdc,#eee5d8)',
      'linear-gradient(#6e91b7,#d7c4cb)',
      'radial-gradient(ellipse at 25% 80%,#62547d,transparent 70%),linear-gradient(#18223d,#5d6289)',
      'radial-gradient(ellipse at 18% 70%,#41416a,transparent 70%),linear-gradient(#0b1027,#28314f)',
    ];
    this.scenery.style.background=skies[index];
    this.host.style.setProperty('--biome-ink',BIOMES[index].ink);
  }
  update(dt:number) {
    this.time+=dt;
    const targetY=Math.max(2.8,this.sim.body.y+1.15);
    this.cameraY+=(targetY-this.cameraY)*(1-Math.exp(-dt*4));
    this.camera.position.set(0,this.cameraY,12);this.camera.lookAt(0,this.cameraY,0);this.camera.updateMatrixWorld();
    const base=Math.floor(this.cameraY/2.2)-4;
    this.sections.forEach((section,i)=>{
      const index=base+i;
      section.position.y=index*2.2;
      section.visible=index>=0&&section.position.y+1.08<=BAMBOO_TOP+.02;
    });
    const body=this.sim.body;
    this.torso.position.set(body.x,body.y,0);this.torso.rotation.z=this.sim.bodyAngle;
    this.head.rotation.z=Math.sin(this.time*1.3)*.025-this.sim.bodyAngle*.35;
    this.hair.rotation.z=Math.sin(this.time*2.3)*.025-this.sim.bodyAngle*.20;
    this.hair.rotation.x=Math.sin(this.time*1.7)*.025;
    const progress=Math.min(1,this.sim.maxHeight/MOON_HEIGHT);
    const moonSize=.37+progress**1.45*.62;
    const moonX=Math.max(.15,Math.min(this.camera.right*.63,this.camera.right-moonSize*1.08));
    this.moon.position.set(moonX,this.cameraY+.50,-6);
    this.moon.scale.setScalar(moonSize);
    this.moon.rotation.z=Math.sin(this.time*.07)*.025;
    this.moonGlow.opacity=(this.finished?.23:.13)+Math.sin(this.time*.8)*.012;
    this.landing.visible=this.sim.maxHeight>=18;
    for(const milestone of this.milestones) {
      const reached=this.sim.maxHeight>=milestone.height;
      milestone.material.opacity=reached?.94:.55;
      milestone.material.color.setHex(reached?0xffe7a1:0xd4bd79);
      milestone.group.rotation.z=Math.sin(this.time*1.7+milestone.height)*.035;
    }
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
    this.particles.position.y=this.cameraY-4+(this.time*(this.boosted?.15:.045))%2;this.particles.rotation.z=Math.sin(this.time*.1)*.025;
    (this.particles.material as THREE.PointsMaterial).opacity=this.finished?.95:this.boosted?.85:Math.min(.75,.48+this.combo*.025);
    this.renderer.render(this.scene,this.camera);
  }
  dispose() { this.observer.disconnect(); this.renderer.dispose(); }
}
