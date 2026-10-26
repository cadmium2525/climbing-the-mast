import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// These small, shared primitives are baked into one mesh per material. Only the
// heads and waving arms remain separate, keeping the lunar welcome light on phones.
const sphere = new THREE.SphereGeometry(1, 14, 10);
const box = new THREE.BoxGeometry(1, 1, 1);
const robe = new THREE.CylinderGeometry(.62, 1, 1, 14);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 14);
const smile = new THREE.TorusGeometry(1, .105, 4, 14, Math.PI);
const crescent = new THREE.TorusGeometry(1, .17, 5, 18, Math.PI * 1.58);
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();

const material = (color: number, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
const palette = {
  skin: material(0xf6d8bd),
  blush: material(0xe9aeb0),
  ink: material(0x262436),
  silver: material(0xb7beca),
  sage: material(0x9bb9af),
  blue: material(0x6b8fa9),
  pearl: material(0xf7f0db),
  cream: material(0xffedd6),
  purple: material(0xa38cba),
  pink: material(0xe8b1c7),
  gold: material(0xeac571, .48),
  white: material(0xfffaf0),
};

type Triple = [number, number, number];

class Shapes {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, surface: THREE.Material, at: Triple, size: Triple, rotation: Triple = [0, 0, 0]) {
    const baked = geometry.clone();
    position.set(...at); scale.set(...size); euler.set(...rotation); quaternion.setFromEuler(euler);
    matrix.compose(position, quaternion, scale); baked.applyMatrix4(matrix);
    const parts = this.parts.get(surface) ?? [];
    parts.push(baked); this.parts.set(surface, parts);
  }

  finish(parent: THREE.Object3D) {
    for (const [surface, pieces] of this.parts) {
      const geometry = mergeGeometries(pieces);
      if (geometry) parent.add(new THREE.Mesh(geometry, surface));
      for (const piece of pieces) piece.dispose();
    }
  }
}

type ParentRig = { head: THREE.Group; wavingArm: THREE.Group; outer: number };

export class MoonFamily {
  readonly group = new THREE.Group();
  private parents: ParentRig[] = [];
  private rabbitEars = new THREE.Group();

  constructor() {
    this.group.name = 'moon-parents';
    this.createParent(false, -1.02);
    this.createParent(true, 1.02);
    this.createRabbit();
    this.update(0, false);
  }

  private createParent(mother: boolean, x: number) {
    const parent = new THREE.Group();
    parent.name = mother ? 'moon-mother' : 'moon-father';
    parent.position.set(x, .22, -.1);
    this.group.add(parent);
    const outer = mother ? 1 : -1;
    const cloth = mother ? palette.cream : palette.sage;
    const trim = mother ? palette.pink : palette.pearl;
    const hem = mother ? palette.purple : palette.blue;
    const body = new Shapes();

    // A broad hem, crossed collar and sash read as court robes at a small size.
    body.add(robe, hem, [0, .46, 0], [.31, .81, .23]);
    body.add(robe, cloth, [0, .58, .015], [.285, .68, .23]);
    body.add(box, trim, [-.063, .81, .199], [.067, .28, .033], [0, 0, .48]);
    body.add(box, trim, [.062, .81, .214], [.067, .28, .033], [0, 0, -.48]);
    body.add(cylinder, mother ? palette.purple : palette.blue, [0, .53, .025], [.235, .13, .228]);
    body.add(sphere, palette.gold, [0, .535, .255], [.046, .037, .016]);
    body.add(sphere, palette.skin, [0, .965, .015], [.075, .09, .075]);
    for (const side of [-1, 1]) {
      body.add(sphere, mother ? palette.pearl : palette.ink, [side * .125, .042, .065], [.102, .041, .14]);
    }
    body.finish(parent);

    const head = new THREE.Group();
    head.position.set(0, 1.15, .012); parent.add(head);
    const features = new Shapes();
    const hair = mother ? palette.ink : palette.silver;
    features.add(sphere, hair, [0, .025, -.035], [.216, .229, .185]);
    features.add(sphere, palette.skin, [0, -.012, .055], [.186, .201, .173]);
    for (const side of [-1, 1]) {
      features.add(sphere, palette.ink, [side * .066, .02, .222], [.015, .022, .012]);
      features.add(sphere, palette.blush, [side * .12, -.046, .193], [.030, .015, .008]);
    }
    features.add(smile, palette.ink, [0, -.05, .231], [.059, .037, .037], [0, 0, Math.PI]);
    features.add(sphere, palette.skin, [0, -.024, .238], [.018, .022, .014]);
    if (mother) {
      features.add(sphere, hair, [0, -.20, -.13], [.212, .37, .105]);
      features.add(sphere, hair, [0, .258, -.045], [.114, .107, .105]);
      for (const side of [-1, 1]) {
        features.add(sphere, hair, [side * .179, -.112, .035], [.038, .199, .056]);
      }
      features.add(crescent, palette.gold, [.133, .17, .124], [.076, .076, .076], [0, 0, -.75]);
      features.add(sphere, palette.gold, [.207, .179, .119], [.025, .025, .025]);
    } else {
      // Silver temples and a tiny beard distinguish the father without hiding his smile.
      for (const side of [-1, 1]) {
        features.add(sphere, hair, [side * .173, -.027, .093], [.032, .078, .049]);
        features.add(sphere, hair, [side * .026, -.068, .222], [.032, .013, .012], [0, 0, side * -.16]);
      }
      features.add(sphere, hair, [0, -.15, .176], [.047, .038, .028]);
      features.add(crescent, palette.gold, [0, .263, .019], [.067, .067, .067], [0, 0, -.75]);
    }
    features.finish(head);

    let wavingArm!: THREE.Group;
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * .205, .89, .026); parent.add(arm);
      const sleeve = new Shapes();
      sleeve.add(robe, cloth, [0, -.155, 0], [.135, .34, .15]);
      sleeve.add(cylinder, trim, [0, -.314, 0], [.133, .055, .148]);
      sleeve.add(sphere, palette.skin, [0, -.386, .012], [.065, .087, .059]);
      sleeve.finish(arm);
      if (side === outer) wavingArm = arm;
      else arm.rotation.z = side * .13;
    }
    this.parents.push({ head, wavingArm, outer });
  }

  private createRabbit() {
    const rabbit = new THREE.Group();
    rabbit.name = 'moon-rabbit'; rabbit.position.set(.47, .22, .23);
    rabbit.scale.setScalar(.88); this.group.add(rabbit);
    const body = new Shapes();
    body.add(sphere, palette.white, [0, .139, 0], [.12, .14, .101]);
    body.add(sphere, palette.white, [0, .298, .037], [.117, .107, .094]);
    body.add(sphere, palette.white, [.115, .113, -.051], [.057, .057, .057]);
    for (const side of [-1, 1]) {
      body.add(sphere, palette.white, [side * .068, .028, .065], [.058, .026, .09]);
      body.add(sphere, palette.ink, [side * .041, .315, .122], [.01, .014, .008]);
    }
    body.add(sphere, palette.pink, [0, .284, .134], [.014, .01, .009]);
    body.finish(rabbit);
    this.rabbitEars.position.set(0, .365, .02); rabbit.add(this.rabbitEars);
    const ears = new Shapes();
    for (const side of [-1, 1]) {
      ears.add(sphere, palette.white, [side * .053, .105, 0], [.032, .143, .032], [0, 0, side * -.14]);
      ears.add(sphere, palette.pink, [side * .053, .115, .028], [.014, .103, .006], [0, 0, side * -.14]);
    }
    ears.finish(this.rabbitEars);
  }

  update(time: number, arrived: boolean) {
    const speed = arrived ? 5.4 : 2.2;
    for (const { head, wavingArm, outer } of this.parents) {
      const phase = time * speed + outer * .65;
      wavingArm.rotation.z = outer * (2.36 + Math.sin(phase) * (arrived ? .24 : .15));
      head.rotation.z = outer * .035 + Math.sin(time * 1.7 + outer) * .018;
      head.rotation.x = arrived ? .035 + Math.sin(time * 3.2 + outer * .3) * .065 : .008;
    }
    this.rabbitEars.rotation.z = Math.sin(time * (arrived ? 4.3 : 1.9)) * (arrived ? .12 : .045);
  }
}
